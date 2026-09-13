import { supabase } from './supabase';
import { Job, DeferredRepair } from '../types';

export const uploadMedia = async (jobId: string, file: Blob, type: string) => {
  const fileName = `${jobId}-${Date.now()}-${type}.jpeg`;
  const { data, error } = await supabase.storage
    .from('motologa_media')
    .upload(fileName, file, { contentType: 'image/jpeg' });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('motologa_media')
    .getPublicUrl(fileName);

  // Save to job_media table
  const { error: dbError } = await supabase.from('job_media').insert({
    job_id: jobId,
    file_url: publicUrlData.publicUrl,
    type,
  });

  if (dbError) {
    throw dbError;
  }

  return publicUrlData.publicUrl;
};

// Map DB Job to UI Job
const mapDbJobToUiJob = (dbJob: any): Job => {
  let uiStatus: Job['status'] = 'Diagnosis';
  if (dbJob.status === 'active') uiStatus = 'In Repair';
  if (dbJob.status === 'ready') uiStatus = 'Ready/Released';

  return {
    id: dbJob.id,
    licensePlate: dbJob.plate,
    customerPhone: '', 
    vehicleModel: '', 
    assigned_to: dbJob.assigned_to,
    assigned_to_profile: dbJob.assigned_to_profile,
    status: uiStatus,
    createdAt: new Date(dbJob.created_at || Date.now()).getTime(),
    partSource: 'Garage Stock',
    laborFeeFcfa: dbJob.labor_fee || 0,
    released: dbJob.status === 'ready',
    dashboardPhotoUrl: dbJob.job_media?.find((m: any) => m.type === 'intake_dash')?.file_url || '',
    exteriorPhotoUrl: dbJob.job_media?.find((m: any) => m.type === 'intake_body')?.file_url || '',
    oldPartPhotoUrl: dbJob.job_media?.find((m: any) => m.type === 'old_part')?.file_url || '',
    newPartPhotoUrl: dbJob.job_media?.find((m: any) => m.type === 'new_part')?.file_url || '',
    voiceNoteUrl: dbJob.job_media?.find((m: any) => m.type === 'voice_note')?.file_url || '',
  };
};

export const fetchJobsForGarage = async (garageId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_media(*),
      assigned_to_profile:garage_members!assigned_to(full_name)
    `)
    .eq('garage_id', garageId);

  if (error) {
    console.error('Error fetching jobs', error);
    return [];
  }

  return data.map((d: any) => mapDbJobToUiJob(d));
};

export const fetchJobsForMechanic = async (mechanicUserId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_media(*),
      assigned_to_profile:garage_members!assigned_to(full_name)
    `)
    .eq('assigned_to', mechanicUserId);

  if (error) {
    console.error('Error fetching jobs', error);
    return [];
  }

  return data.map((d: any) => mapDbJobToUiJob(d));
};

export const createJob = async (job: Partial<Job>, garageId: string, assignedToUserId: string) => {
  let dbStatus = 'intake';
  if (job.status === 'In Repair') dbStatus = 'active';
  if (job.status === 'Ready/Released') dbStatus = 'ready';

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      garage_id: garageId,
      assigned_to: assignedToUserId, // Strict UUID
      plate: job.licensePlate || 'UNKNOWN',
      status: dbStatus,
      labor_fee: job.laborFeeFcfa || 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Insert failed: No data returned from Supabase.");
  return data;
};

export const updateJobStatus = async (jobId: string, status: string, laborFee: number = 0) => {
  let dbStatus = 'intake';
  if (status === 'In Repair') dbStatus = 'active';
  if (status === 'Ready/Released') dbStatus = 'ready';

  const { data, error } = await supabase
    .from('jobs')
    .update({ status: dbStatus, labor_fee: laborFee })
    .eq('id', jobId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to update job status");
};

export const fetchDeferredRepairs = async (jobIds: string[]): Promise<DeferredRepair[]> => {
    if(!jobIds || jobIds.length === 0) return [];
  const { data, error } = await supabase
    .from('deferred_repairs')
    .select('*')
    .in('job_id', jobIds);

  if (error) {
    console.error('Error fetching deferred repairs', error);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    vehiclePlate: '', 
    customerPhone: '',
    componentToFix: d.component,
    targetDateString: d.target_date,
    status: d.status,
  }));
};

export const createDeferredRepair = async (repair: DeferredRepair, jobId: string) => {
  const { data, error } = await supabase.from('deferred_repairs').insert({
    job_id: jobId,
    component: repair.componentToFix,
    target_date: repair.targetDateString,
    status: repair.status,
  }).select().single();

  if (error || !data) throw new Error(error?.message || "Failed to create deferred repair");
  return data;
};

// ==========================================
// Multi-Tier Departments & Membership API
// ==========================================

export const fetchGarage = async (garageId: string) => {
  const { data, error } = await supabase
    .from('garages')
    .select('*')
    .eq('id', garageId)
    .single();

  if (error) throw error;
  return data;
};

export const fetchDepartments = async (garageId: string) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('garage_id', garageId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
  return data || [];
};

export const createDepartment = async (garageId: string, name: string, description?: string) => {
  const { data, error } = await supabase
    .from('departments')
    .insert({
      garage_id: garageId,
      name,
      description,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create department');
  return data;
};

export const deleteDepartment = async (departmentId: string) => {
  const { data, error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to delete department');
  return data;
};

export const fetchGarageMembers = async (garageId: string) => {
  const { data, error } = await supabase
    .from('garage_members')
    .select(`
      *,
      departments (
        id,
        name
      )
    `)
    .eq('garage_id', garageId);

  if (error) {
    console.error('Error fetching garage members:', error);
    return [];
  }
  return data || [];
};

export const updateMemberDepartment = async (memberId: string, departmentId: string | null) => {
  const { data, error } = await supabase
    .from('garage_members')
    .update({ department_id: departmentId })
    .eq('id', memberId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update department assignment');
  return data;
};

export const updateMemberRole = async (memberId: string, nextRole: 'owner' | 'hod' | 'worker') => {
  const { data, error } = await supabase
    .from('garage_members')
    .update({ role: nextRole })
    .eq('id', memberId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update HOD role');
  return data;
};

export const removeMemberFromDepartment = async (memberId: string) => {
  const { data, error } = await supabase
    .from('garage_members')
    .update({ department_id: null, role: 'worker' })
    .eq('id', memberId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to remove worker from department');
  return data;
};

export const joinGarageMember = async (
  garageId: string,
  userId: string,
  departmentId: string | null,
  role: 'owner' | 'hod' | 'worker' = 'worker',
  email?: string,
  fullName?: string
) => {
  const payload: any = {
    garage_id: garageId,
    user_id: userId,
    role,
    department_id: departmentId || null,
  };
  if (email) payload.email = email;
  if (fullName) payload.full_name = fullName;

  const { data, error } = await supabase
    .from('garage_members')
    .insert(payload)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to join garage');
  return data;
};

export const updateGarageSubscription = async (
  garageId: string,
  status: 'active' | 'past_due' | 'trialing'
) => {
  const { data, error } = await supabase
    .from('garages')
    .update({ subscription_status: status })
    .eq('id', garageId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update subscription status');
  return data;
};
