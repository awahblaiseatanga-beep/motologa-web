import { supabase } from './supabase';
import { Job, DeferredRepair, DeferredStatus } from '../types';

// Typed interface for job_media rows
interface DbJobMedia {
  type: string;
  file_url: string;
}
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
export const mapDbJobToUiJob = (dbJob: Record<string, unknown>): Job => {
  const status = dbJob.status as string;
  let uiStatus: Job['status'] = 'Diagnosis';
  if (status === 'active' || status === 'in_progress') uiStatus = 'In Repair';
  if (status === 'ready' || status === 'pending_checkout') uiStatus = 'Ready/Released';
  if (status === 'paused') uiStatus = 'Paused';

  const media = (dbJob.job_media || []) as DbJobMedia[];

  return {
    id: dbJob.id as string,
    licensePlate: (dbJob.plate as string) || '',
    customerPhone: (dbJob.customer_phone as string) || (dbJob.phone as string) || '',
    customerName: (dbJob.customer_name as string) || 'Walk-in Client',
    vehicleModel: (dbJob.vehicle_model as string) || '',
    issueDescription: (dbJob.description as string) || (dbJob.title as string) || (dbJob.issue_description as string) || '',
    assigned_to: dbJob.assigned_to as string | undefined,
    mechanic: (Array.isArray(dbJob.mechanic) ? dbJob.mechanic[0] : dbJob.mechanic) as { full_name?: string; email?: string } | undefined,
    status: uiStatus,
    createdAt: new Date((dbJob.created_at as string) || Date.now()).getTime(),
    partSource: 'Garage Stock',
    laborFeeFcfa: (dbJob.labor_fee as number) || 0,
    partsFeeFcfa: (dbJob.parts_fee as number) || 0,
    released: status === 'ready',
    dashboardPhotoUrl: media.find((m) => m.type === 'intake_dash')?.file_url || '',
    exteriorPhotoUrl: media.find((m) => m.type === 'intake_body')?.file_url || '',
    oldPartPhotoUrl: media.find((m) => m.type === 'old_part')?.file_url || '',
    newPartPhotoUrl: media.find((m) => m.type === 'new_part')?.file_url || '',
    generalJobPhotoUrl: media.find((m) => m.type === 'general_job')?.file_url || (dbJob.general_job_photo_url as string) || '',
    voiceNoteUrl: media.find((m) => m.type === 'intake_voice_note')?.file_url || media.find((m) => m.type === 'voice_note')?.file_url || '',
    diagnosticVoiceNoteUrl: media.find((m) => m.type === 'diagnostic_voice_note')?.file_url || '',
    diagnosticNotes: (dbJob.diagnostic_notes as string) || (dbJob.mechanic_notes as string) || '',
  };
};

export const fetchJobsForGarage = async (garageId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_media(*),
      mechanic:garage_members!jobs_assigned_to_fkey(full_name, email)
    `)
    .eq('garage_id', garageId)
    .neq('status', 'completed');

  if (error) {
    console.error('Error fetching jobs', error);
    return [];
  }

  return data.map((d: Record<string, unknown>) => mapDbJobToUiJob(d));
};

export const fetchJobsForMechanic = async (mechanicUserId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_media(*),
      mechanic:garage_members!jobs_assigned_to_fkey(full_name, email)
    `)
    .eq('assigned_to', mechanicUserId)
    .neq('status', 'completed');

  if (error) {
    console.error('Error fetching jobs', error);
    return [];
  }

  return data.map((d: Record<string, unknown>) => mapDbJobToUiJob(d));
};

export const fetchCompletedInvoicesToday = async (garageId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_media(*),
      mechanic:garage_members!jobs_assigned_to_fkey(full_name, email)
    `)
    .eq('garage_id', garageId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  
  // Local filtering to guarantee daily isolation regardless of timezone indices
  const todayLocalStr = new Date().toDateString();
  return data
    .filter((d: any) => new Date(d.created_at).toDateString() === todayLocalStr)
    .map((d: Record<string, unknown>) => mapDbJobToUiJob(d));
};

export const createJob = async (job: Partial<Job>, garageId: string, assignedToUserId: string) => {
  let dbStatus = 'pending';
  if (job.status === 'In Repair') dbStatus = 'in_progress';
  if (job.status === 'Ready/Released') dbStatus = 'pending_checkout';
  if (job.status === 'Paused') dbStatus = 'paused';

  const finalAssignedTarget = assignedToUserId || null;

  // 1. Relational Upsert: Customers table
  const { data: customerRecord } = await supabase
    .from('customers')
    .upsert(
      { 
        phone: job.customerPhone || 'Unknown', 
        name: job.customerName || 'Walk-in Client' 
      }, 
      { onConflict: 'phone' }
    )
    .select('id')
    .single();

  // 1.5. Relational Upsert: Vehicles table
  const { data: vehicleRecord } = await supabase
    .from('vehicles')
    .upsert(
      { 
        plate: job.licensePlate || 'UNKNOWN', 
        model: job.vehicleModel || 'Unspecified',
        make: 'Unknown' // Derived from unspecified form state
      }, 
      { onConflict: 'plate' }
    )
    .select('id')
    .single();

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      garage_id: garageId,
      assigned_to: finalAssignedTarget, 
      status: dbStatus,
      description: job.issueDescription || '',
      labor_fee: job.laborFeeFcfa || 0,
      customer_id: customerRecord?.id || null,
      vehicle_id: vehicleRecord?.id || null
    })
    .select()
    .single();

  if (error) {
    console.error("SUPABASE INSERT ERROR MESSAGE:", error.message);
    console.error("SUPABASE INSERT ERROR DETAILS:", error.details);
    throw new Error(error.message || "A database error occurred while creating this job.");
  }
  if (!data) throw new Error("Insert failed: No data returned securely from the server.");

  // Async media extraction and Supabase Storage pushing
  const uploadAndLink = async (urlStr: string | undefined, prefix: string) => {
    if (!urlStr || (!urlStr.startsWith('data:') && !urlStr.startsWith('blob:'))) return;
    try {
      const res = await fetch(urlStr);
      const blob = await res.blob();
      const filePath = `${data.id}/${prefix}_${Date.now()}`;
      const { error: uploadErr } = await supabase.storage.from('garage-media').upload(filePath, blob, { contentType: blob.type });
      if (!uploadErr) {
        const { data: pubData } = supabase.storage.from('garage-media').getPublicUrl(filePath);
        await supabase.from('job_media').insert({ job_id: data.id, file_url: pubData.publicUrl, type: prefix });
      }
    } catch (e) {
      console.warn(`Failed to upload ${prefix}:`, e);
    }
  };

  await Promise.all([
    uploadAndLink(job.dashboardPhotoUrl, 'intake_dash'),
    uploadAndLink(job.exteriorPhotoUrl, 'intake_body'),
    uploadAndLink(job.voiceNoteUrl, 'voice_note')
  ]);

  return data;
};

export const updateJobStatus = async (jobId: string, status: string, laborFee: number = 0) => {
  let dbStatus = 'pending';
  if (status === 'In Repair') dbStatus = 'in_progress';
  if (status === 'Ready/Released') dbStatus = 'pending_checkout';
  if (status === 'Paused') dbStatus = 'paused';

  const { data, error } = await supabase
    .from('jobs')
    .update({ status: dbStatus, labor_fee: laborFee })
    .eq('id', jobId)
    .select()
    .single();

  if (error || !data) throw new Error("A database error occurred while updating the job status.");
};

export const fetchDeferredRepairs = async (jobIds: string[]): Promise<DeferredRepair[]> => {
    if(!jobIds || jobIds.length === 0) return [];
  const { data, error } = await supabase
    .from('deferred_repairs')
    .select('id, job_id, component, target_date, status')
    .in('job_id', jobIds);

  if (error) {
    console.error('Error fetching deferred repairs', error);
    return [];
  }

  return data.map((d: { id: string; component: string; target_date: string; status: string }) => ({
    id: d.id,
    vehiclePlate: '', 
    customerPhone: '',
    componentToFix: d.component,
    targetDateString: d.target_date,
    status: d.status as DeferredStatus,
  }));
};

export const createDeferredRepair = async (repair: DeferredRepair, jobId: string) => {
  const { data, error } = await supabase.from('deferred_repairs').insert({
    job_id: jobId,
    component: repair.componentToFix,
    target_date: repair.targetDateString,
    status: repair.status,
  }).select().single();

  if (error || !data) throw new Error("A database structure violation prevented the deferred repair from being saved.");
  return data;
};

// ==========================================
// Multi-Tier Departments & Membership API
// ==========================================

export const fetchGarage = async (garageId: string) => {
  const { data, error } = await supabase
    .from('garages')
    .select('id, owner_id, name, subscription_status, trial_ends_at, created_at')
    .eq('id', garageId)
    .single();

  if (error) throw error;
  return data;
};

export const fetchDepartments = async (garageId: string) => {
  const { data, error } = await supabase
    .from('departments')
    .select('id, garage_id, name, description, created_at')
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

export const provisionDepartment = async (garageId: string, name: string, role: string) => {
  const { data, error } = await supabase
    .from('departments')
    .insert({
      garage_id: garageId,
      name,
      role // Explicitly bound column per DB verification
    })
    .select()
    .single();

  if (error || !data) throw new Error('A database constraint prevented this department creation. Please verify your inputs.');
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

// ==========================================
// B2B Workspace Provisioning API
// ==========================================

export const provisionNewWorkshop = async (ownerId: string, shopName: string, phone: string, address: string) => {
  // 1. Create Garage (Core Entity)
  const { data: garageData, error: garageError } = await supabase
    .from('garages')
    .insert({
      owner_id: ownerId,
      name: shopName,
      subscription_status: 'active'
    })
    .select()
    .single();
    
  if (garageError || !garageData) throw new Error("A database constraint prevented the workshop from being created securely.");

  // 2. Map Owner Permissions globally into membership tables
  const { error: memberError } = await supabase
    .from('garage_members')
    .insert({
      garage_id: garageData.id,
      user_id: ownerId,
      role: 'owner',
      full_name: 'Workshop Administrator'
    });
    
  if (memberError) throw new Error("Failed to assign root privileges securely to this workshop.");

  // 3. Upsert global Shop Settings generically protecting ID cascades seamlessly
  const { error: settingsError } = await supabase
    .from('shop_settings')
    .upsert({
      id: 1, // Ensures absolute legacy compatibility internally matching local loops strictly
      shop_name: shopName,
      shop_address: address,
      whatsapp_template: `Hello, this is ${shopName}. `
    }, { onConflict: 'id' });

  if (settingsError) {
    console.error("ShopSettings initialization warning:", settingsError); // Non-fatal structurally
  }

  return garageData;
};

export const fetchGarageMembers = async (garageId: string) => {
  // Attempt fetching with profiles join per requirement
  const { data, error } = await supabase
    .from('garage_members')
    .select(`
      *,
      departments (
        id,
        name
      ),
      profiles (
        full_name,
        email
      )
    `)
    .eq('garage_id', garageId);

  // If the schema lacks the 'profiles' table or relationship, fallback to safe query
  if (error && (error.code === 'PGRST205' || error.message.includes('relationship'))) {
    console.warn('Profiles schema not found or relation failed. Falling back to default payload.', error);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('garage_members')
      .select(`
        *,
        departments (
          id,
          name
        )
      `)
      .eq('garage_id', garageId);
      
    if (fallbackError) {
      console.error('Error fetching garage members (fallback):', fallbackError);
      return [];
    }
    return fallbackData || [];
  }

  if (error) {
    console.error('Error fetching garage members:', error);
    return [];
  }
  
  return (data || []).map((m: any) => ({
    ...m,
    full_name: m.profiles?.full_name || m.full_name,
    email: m.profiles?.email || m.email,
  }));
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
  role: string = 'worker'
) => {
  // Strict check-constraint fallback: only allow 'owner' or 'hod', otherwise default to 'worker'
  const safeRole = (role === 'owner' || role === 'hod') ? role : 'worker';

  const payload = {
    garage_id: garageId,
    user_id: userId,
    role: safeRole,
    department_id: departmentId || null,
  };

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
