import { supabase } from './supabase';
import { Job, DeferredRepair, DeferredStatus, Appointment, AppointmentStatus } from '../types';

export const hasNarrativeContent = (text?: string | null, voiceUrl?: string | null): boolean => {
  return (text?.trim().length || 0) > 0 || Boolean(voiceUrl);
};

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
  if (status === 'awaiting_approval') uiStatus = 'Awaiting Approval';
  if (status === 'active' || status === 'in_progress' || status === 'IN_PROGRESS') uiStatus = 'In Repair';
  if (status === 'paused') uiStatus = 'Paused';
  if (status === 'pending_hod_review' || status === 'PENDING_HOD_REVIEW') uiStatus = 'Pending QC';
  
  if (status === 'completed' || status === 'COMPLETED' || status === 'RELEASED') {
    if (dbJob.hod_review_pending === true) {
      uiStatus = 'Pending QC';
    } else if (dbJob.hod_review_pending === false && (!dbJob.released)) {
      uiStatus = 'Ready/Released';
    } else {
      uiStatus = 'Work Done'; // e.g., released is true, or fallback
    }
  }

  // Legacy fallback strings
  if (status === 'ready' || status === 'pending_checkout' || status === 'PENDING_CHECKOUT') uiStatus = 'Ready/Released';

  const media = (dbJob.job_media || []) as DbJobMedia[];

  return {
    id: dbJob.id as string,
    licensePlate: (dbJob.vehicles as any)?.plate || (dbJob.plate as string) || '',
    customerPhone: (dbJob.customers as any)?.phone || (dbJob.customer_phone as string) || (dbJob.phone as string) || '',
    customerName: (dbJob.customers as any)?.name || (dbJob.customer_name as string) || 'Walk-in Client',
    vehicleModel: (dbJob.vehicles as any)?.model || (dbJob.vehicle_model as string) || '',
    issueDescription: (dbJob.description as string) || (dbJob.title as string) || (dbJob.issue_description as string) || '',
    estimateNotes: (dbJob.estimate_notes as string) || '',
    assigned_to: dbJob.assigned_to as string | undefined,
    mechanic: (() => {
      const mech: any = Array.isArray(dbJob.mechanic) ? dbJob.mechanic[0] : dbJob.mechanic;
      if (!mech) return undefined;
      return {
        full_name: mech.profiles?.full_name || mech.full_name,
        email: mech.profiles?.email || mech.email
      };
    })(),
    mechanic_name: (dbJob.mechanic_name as string) || undefined,
    hod_name: (dbJob.hod_name as string) || undefined,
    status: uiStatus,
    createdAt: new Date((dbJob.created_at as string) || Date.now()).getTime(),
    partSource: 'Garage Stock',
    laborFeeFcfa: (dbJob.labor_fee as number) || 0,
    partsFeeFcfa: (dbJob.parts_fee as number) || 0,
    released: status === 'ready' || status === 'RELEASED',
    dashboardPhotoUrl: media.find((m) => m.type === 'intake_dash')?.file_url || '',
    exteriorPhotoUrl: media.find((m) => m.type === 'intake_body')?.file_url || '',
    oldPartPhotoUrl: media.find((m) => m.type === 'old_part')?.file_url || '',
    newPartPhotoUrl: media.find((m) => m.type === 'new_part')?.file_url || '',
    generalJobPhotoUrl: media.find((m) => m.type === 'general_job')?.file_url || (dbJob.general_job_photo_url as string) || '',
    voiceNoteUrl: media.find((m) => m.type === 'intake_voice_note')?.file_url || media.find((m) => m.type === 'voice_note')?.file_url || '',
    diagnosticVoiceNoteUrl: media.find((m) => m.type === 'diagnostic_voice_note')?.file_url || '',
    workerVoiceNoteUrl: media.find((m) => m.type === 'worker_voice_note')?.file_url || (dbJob.worker_voice_note_url as string) || '',
    diagnosticNotes: (dbJob.diagnostic_notes as string) || (dbJob.mechanic_notes as string) || '',
    workerNotes: (dbJob.worker_notes as string) || '',
    hodJobSummary: (dbJob.hod_job_summary as string) || '',
    hod_rejection_note: (dbJob.hod_rejection_note as string) || null,
    hod_voice_note_url: (dbJob.hod_voice_note_url as string) || null,
    startedAt: (dbJob.started_at as string) || undefined,
    completedAt: (dbJob.completed_at as string) || undefined,
    garageInfo: dbJob.garages ? {
      name: (dbJob.garages as any).name || '',
      location: (dbJob.garages as any).location,
      phone: (dbJob.garages as any).phone,
      email: (dbJob.garages as any).email,
      ownerPhone: (dbJob.garages as any).owner?.phone || (dbJob.garages as any).profiles?.phone,
      ownerEmail: (dbJob.garages as any).owner?.email || (dbJob.garages as any).profiles?.email,
      brandColor: (dbJob.garages as any).brand_color,
      invoiceMessage: (dbJob.garages as any).invoice_message,
      watermarkUrl: (dbJob.garages as any).watermark_url,
    } : undefined
  };
};

export const fetchJobsForGarage = async (garageId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_media(*),
      customers(name, phone),
      vehicles(make, model, plate),
      mechanic:garage_members!jobs_assigned_to_fkey(id, role, profiles(full_name, email)),
      garages ( name, brand_color, invoice_message, watermark_url, owner_id )
    `)
    .eq('garage_id', garageId);

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
      customers(name, phone),
      vehicles(make, model, plate),
      mechanic:garage_members!jobs_assigned_to_fkey(id, role, profiles(full_name, email)),
      garages ( name, brand_color, invoice_message, watermark_url, owner_id )
    `)
    .eq('assigned_to', mechanicUserId)
    .eq('status', 'IN_PROGRESS');

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
      customers(name, phone),
      vehicles(make, model, plate),
      mechanic:garage_members!jobs_assigned_to_fkey(id, role, profiles(full_name, email)),
      garages ( name, brand_color, invoice_message, watermark_url, owner_id )
    `)
    .eq('garage_id', garageId)
    .in('status', ['completed', 'COMPLETED', 'RELEASED'])
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
      vehicle_id: vehicleRecord?.id || null,
      ...(dbStatus === 'in_progress' ? { started_at: new Date().toISOString() } : {})
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
  if (status === 'In Repair') dbStatus = 'IN_PROGRESS';
  if (status === 'Paused') dbStatus = 'paused';

  // Create base payload mapping 
  const payload: any = { status: dbStatus, labor_fee: laborFee };

  if (dbStatus === 'IN_PROGRESS') {
    const { data: currentJob } = await supabase.from('jobs').select('started_at').eq('id', jobId).single();
    if (currentJob && !currentJob.started_at) {
      payload.started_at = new Date().toISOString();
    }
  }

  if (status === 'Ready/Released') {
    payload.status = 'COMPLETED';
    payload.hod_review_pending = false;
    payload.completed_at = new Date().toISOString();
  }
  
  if (status === 'Pending QC') {
    payload.status = 'COMPLETED';
    payload.hod_review_pending = true;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(payload)
    .eq('id', jobId)
    .select()
    .single();

  if (error || !data) {
    console.error("DB Error:", error);
    throw error;
  }
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
      description: role
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

interface ApiGarageMemberResponse {
  id: string;
  garage_id: string;
  user_id: string;
  role: 'owner' | 'hod' | 'worker';
  department_id: string | null;
  created_at?: string;
  is_hod?: boolean;
  departments?: { id: string; name: string } | null;
  profiles?: { full_name?: string; email?: string } | null;
}

export const fetchGarageMembers = async (garageId: string) => {
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
    .eq('garage_id', garageId) as { data: ApiGarageMemberResponse[] | null, error: any };

  if (error) {
    console.error('Error fetching garage members natively:', error);
    return [];
  }

  // Restore the data securely utilizing null-coalescing loops to enforce hard boundaries
  return (data || []).map((m) => ({
    ...m,
    full_name: m.profiles?.full_name ?? 'Unnamed Staff',
    email: m.profiles?.email ?? ''
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

// ==========================================
// APPOINTMENTS SCHEDULING PIPELINE (Phase 3A)
// ==========================================

export const promoteFindingToAppointment = async (
  findingId: string,
  departmentId: string,
  scheduledDate: string,
  scheduledTime: string,
  issueDescription: string | null,
  voiceNoteUrl?: string | null
) => {
  // Safely enforce YYYY-MM-DD string representation without triggering timezone shifts
  const safeDate = typeof scheduledDate === 'string' ? scheduledDate.slice(0, 10) : ''; 
  
  // Safely enforce HH:MM:SS for the PostgreSQL TIME parameter
  const safeTime = scheduledTime 
    ? (scheduledTime.length === 5 ? `${scheduledTime}:00` : scheduledTime) 
    : null;

  const { data, error } = await supabase.rpc('promote_finding_to_appointment', {
    p_finding_id: findingId,
    p_department_id: departmentId,
    p_scheduled_date: safeDate,
    p_scheduled_time: safeTime,
    p_issue_description: issueDescription || null,
    p_voice_note_url: voiceNoteUrl || null
  });

  if (error) {
    console.error('RPC Schema Validation Failed:', error);
    throw new Error(error.message || 'Failed to schedule appointment natively.');
  }

  return data; // Returns the new UUID of the appointment
};

export const fetchAppointments = async (garageId: string, departmentId?: string): Promise<Appointment[]> => {
  let query = supabase
    .from('appointments')
    .select('*, customers(*), vehicles(*), departments(*)')
    .eq('garage_id', garageId);
  
  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }
  
  // Sort strictly by soonest upcoming
  query = query.order('scheduled_date', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('Database Appointments Lookup Failed:', error);
    return [];
  }
  
  return data as Appointment[];
};

export const createDirectAppointment = async (
  garageId: string,
  departmentId: string,
  customerName: string,
  customerPhone: string,
  vehiclePlate: string,
  vehicleModel: string,
  scheduledDate: string,
  scheduledTime: string,
  issueDescription: string | null,
  voiceNoteUrl: string | null,
  source: 'direct_booking' | 'checkout'
) => {
  // Gracefully sanitize departmentId to null if falsy to protect UUID typecast
  const safeDeptId = departmentId ? departmentId : null;

  // 1. Relational Upsert: Customers table
  const { data: customerRecord, error: customerError } = await supabase
    .from('customers')
    .upsert(
      { 
        phone: customerPhone || 'Unknown', 
        name: customerName || 'Walk-in Client'
      }, 
      { onConflict: 'phone' }
    )
    .select('id')
    .single();

  if (customerError) {
    console.error('Failed to upsert booking customer:', customerError);
    throw new Error('Database rejected client initialization.');
  }

  // 2. Relational Upsert: Vehicles table
  const { data: vehicleRecord, error: vehicleError } = await supabase
    .from('vehicles')
    .upsert(
      { 
        plate: vehiclePlate || 'UNKNOWN', 
        model: vehicleModel || 'Unspecified',
        make: 'Unknown' // Derived from unspecified form state
      }, 
      { onConflict: 'plate' }
    )
    .select('id')
    .single();

  if (vehicleError) {
    console.error('Failed to upsert booking vehicle:', vehicleError);
    throw new Error('Database rejected vehicle registration.');
  }

  // 3. Insert Appointment natively mapping UUIDs
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      garage_id: garageId,
      department_id: departmentId || null,
      customer_id: customerRecord?.id || null,
      vehicle_id: vehicleRecord?.id || null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      issue_description: issueDescription || null,
      voice_note_url: voiceNoteUrl || null,
      source: source,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create direct appointment:', error);
    throw new Error(error.message || 'Database rejected appointment creation.');
  }

  return data;
};

export const updateAppointmentStatus = async (
  appointmentId: string, 
  newStatus: AppointmentStatus,
  additionalUpdates: Record<string, any> = {}
): Promise<void> => {
  const { error } = await supabase
    .from('appointments')
    .update({ 
      status: newStatus, 
      updated_at: new Date().toISOString(),
      ...additionalUpdates
    })
    .eq('id', appointmentId);

  if (error) {
    console.error(`Failed to transition appointment ${appointmentId} to ${newStatus}:`, error);
    throw error;
  }
};

export const convertAppointmentToJob = async (appointmentId: string): Promise<string> => {
   const { data, error } = await supabase.rpc('convert_appointment_to_job', {
     p_appointment_id: appointmentId
   });

   if (error) {
     console.error('Failed to convert appointment to job:', error);
     throw new Error(error.message || 'Database rejected atomic conversion.');
   }

   return data; // Returns the newly created UUID
};
