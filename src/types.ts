export type JobStatus = 'Diagnosis' | 'Awaiting Approval' | 'In Repair' | 'Paused' | 'Pending QC' | 'Work Done' | 'Ready/Released';

export type PartSource = 'Customer-Supplied Part' | 'Worker Bought' | 'Garage Stock' | 'Garage Inventory';

export type DeferredTimeframe = 'Next Week' | 'In 2 Weeks' | 'End of Month' | 'Next Month' | 'In 3 Months';

export type DeferredStatus = 'pending' | 'contacted';

export interface DeferredRepair {
  id: string;
  vehiclePlate: string;
  customerPhone: string;
  componentToFix: string;
  targetDateString: string; // e.g., "Next Week", "In 2 Weeks", "End of Month"
  status: DeferredStatus;
  createdAt?: number;
  contactedAt?: number;
  // Compatibility fields for existing job models
  flagged?: boolean;
  component?: string;
  timeframe?: string;
}

export interface Job {
  id: string;
  licensePlate: string;
  customerPhone: string;
  customerName?: string;
  vehicleModel: string;
  assigned_to?: string;
  mechanic?: { full_name?: string; email?: string };
  mechanic_name?: string;
  hod_name?: string;
  status: JobStatus;
  createdAt: number;
  timeElapsedMinutes?: number;
  dashboardPhotoUrl?: string;
  exteriorPhotoUrl?: string;
  oldPartPhotoUrl?: string;
  newPartPhotoUrl?: string;
  generalJobPhotoUrl?: string;
  partSource: PartSource;
  laborFeeFcfa: number;
  partsFeeFcfa?: number;
  deferredRepair?: DeferredRepair | { flagged: boolean; component: string; timeframe: string };
  issueDescription?: string;
  estimateNotes?: string;
  diagnosticNotes?: string;
  workerNotes?: string;
  hodJobSummary?: string;
  voiceNoteUrl?: string;
  workerVoiceNoteUrl?: string;
  diagnosticVoiceNoteUrl?: string;
  voiceNoteDurationSeconds?: number;
  hod_rejection_note?: string;
  hod_voice_note_url?: string;
  hod_review_pending?: boolean;
  releasedAt?: number;
  released?: boolean;
  mechanicAssigned?: string;
  workerCompleted?: boolean;
  startedAt?: string;
  completedAt?: string;
  workerCompletedAt?: number;
  inspectedByHod?: boolean;
  inspectedAt?: number;
  inspectedBy?: string;
  garageInfo?: {
    name: string;
    location?: string;
    phone?: string;
    email?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    brandColor?: string;
    invoiceMessage?: string;
    watermarkUrl?: string;
  };
}

export interface AppointmentReservation {
  id: string;
  vehiclePlate: string;
  customerPhone?: string;
  vehicleModel?: string;
  mechanicAssigned?: string;
  notes?: string;
  serviceRequested?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  audioUrl?: string;
}

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'cancelled' | 'no_show' | 'converted_to_job';
export type AppointmentSource = 'additional_finding' | 'direct_booking' | 'checkout';

export interface Appointment {
  id: string;
  garage_id: string;
  department_id: string;
  customer_id?: string;
  vehicle_id?: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time?: string; // HH:mm:ss
  issue_description?: string;
  voice_note_url?: string;
  source: AppointmentSource;
  source_job_id?: string;
  source_finding_id?: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface GarageStats {
  todayRevenueFcfa: number;
  vehiclesReadyCount: number;
  needsAttentionCount: number;
  totalIntakeToday: number;
}

export type WorkerStatus = 'active' | 'busy' | 'break';

export interface WorkerProfile {
  id: string;
  name: string;
  role: string;
  specialty: string;
  phone: string;
  description: string;
  image: string;
  isVerified: boolean;
  status: WorkerStatus;
  completedJobs: number;
  rating: number;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
  createdAt: number;
  pinCode?: string;
  colorBadge?: string;
}

export const COMPONENT_OPTIONS = [
  'Brake Pads',
  'Timing Belt',
  'Suspension',
  'AC System',
  'General Service',
];
export const TIMEFRAME_OPTIONS = [
  'Next Week',
  'In 2 Weeks',
  'End of Month',
];
export const DEFERRED_COMPONENTS = [
  'Brake Pads / Plaquettes de frein',
  'Timing Belt / Courroie de distribution',
  'Shock Absorbers / Amortisseurs',
  'Clutch Disc / Disque d\'embrayage',
  'Oil & Filter / Vidange & Filtre',
  'Front Ball Joints / Rotules de suspension',
  'Alternator Belt / Courroie d\'alternateur',
  'Battery Replacement / Batterie',
  'Tires Replacement / Pneumatiques'
];

export function sanitizeCameroonPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('237')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return cleaned;
}

export function generateWhatsAppReminderUrl(customerPhone: string, componentToFix: string, vehiclePlate: string): string {
  const cleanPhone = sanitizeCameroonPhone(customerPhone);
  const message = `Bonjour, this is MOTOLOGA Garage. You asked us to remind you regarding the ${componentToFix} for vehicle ${vehiclePlate}. Are you available to bring the car in soon?`;
  return `https://wa.me/237${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface Garage {
  id: string;
  owner_id: string;
  name: string;
  subscription_status: string;
  trial_ends_at: string;
  created_at?: string;
  location?: string;
  phone?: string;
  email?: string;
  brand_color?: string;
  invoice_message?: string;
  watermark_url?: string;
}

export interface Department {
  id: string;
  garage_id: string;
  name: string;
  role?: string;
  description?: string;
  created_at?: string;
}

export interface GarageMember {
  id: string;
  garage_id: string;
  user_id: string;
  role: 'owner' | 'hod' | 'worker';
  department_id: string | null;
  email?: string;
  full_name?: string;
  created_at?: string;
  department?: Department;
  garages?: Garage;
  is_hod?: boolean;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

export interface InventoryItem {
  id: string;
  garage_id: string;
  part_name: string;
  category?: string;
  part_number?: string;
  quantity_in_stock: number;
  minimum_stock_level: number;
  buying_price: number;
  selling_price: number;
  image_url?: string;
  created_at?: string;
}
