import React, { useState, useEffect, useMemo } from 'react';
import { QueueScreen } from './QueueScreen';
import { RosterScreen } from './RosterScreen';
import { AppointmentsScreen } from './AppointmentsScreen';
import { IntakeScreen } from '../components/IntakeScreen';
import { CustomerOutboxScreen } from './CustomerOutboxScreen';
import { LicensePlateBadge } from '../components/LicensePlateBadge';
import { AnimatedTabBar, TabItem } from '../components/ui/animated-tab-bar';
import { fetchGarageMembers, fetchDepartments, createJob, mapDbJobToUiJob } from '../lib/api';
import { supabase } from '../lib/supabase';
import { InvoiceGenerator } from '../components/InvoiceGenerator';
import { VoiceRecorderField } from '../components/VoiceRecorderField';
import { GarageMember, Department, Job, DeferredRepair, JobStatus, AppointmentReservation } from '../types';
import {
  Users,
  Wrench,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Send,
  FileEdit,
  Check,
  Car,
  Save,
  Phone,
  UserCheck,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Printer,
  Mic,
  Square,
  FileAudio,
  ShieldAlert,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

export interface HodDashboardProps {
  userId: string;
  garageId: string;
  departmentId?: string;
  departmentName?: string;
  membership?: GarageMember | null;
  garageName?: string;
  jobs?: Job[];
  deferredRepairs?: DeferredRepair[];
  onUpdateJob?: (job: Job) => void;
  onAddJob?: (job: Job) => Promise<void> | void;
  onNavigateToCheckout?: (jobId?: string) => void;
  activeTab?: 'queue' | 'roster' | 'intake' | 'appointments' | 'outbox';
  onTabChange?: (tab: 'queue' | 'roster' | 'intake' | 'appointments' | 'outbox') => void;
  hideTopNav?: boolean;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({
  userId,
  garageId,
  departmentId,
  departmentName,
  membership,
  garageName,
  jobs: passedJobs,
  deferredRepairs,
  onUpdateJob,
  onAddJob,
  onNavigateToCheckout,
  activeTab: propActiveTab,
  onTabChange,
  hideTopNav = false,
}) => {
  const [internalTab, setInternalTab] = useState<'queue' | 'roster' | 'intake' | 'appointments' | 'outbox'>('queue');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;
  const handleTabSelect = (tab: 'queue' | 'roster' | 'intake' | 'appointments' | 'outbox') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const HOD_TABS = useMemo(() => {
    const tabs: TabItem[] = [
      { id: 'queue', label: 'Floor', icon: <Wrench className="w-5 h-5" />, color: '#34d399' },
      { id: 'outbox', label: 'Outbox', icon: <Send className="w-5 h-5" />, color: '#38bdf8' },
      { id: 'roster', label: 'Staff', icon: <Users className="w-5 h-5" />, color: '#a78bfa' },
      { id: 'appointments', label: 'Bookings', icon: <Calendar className="w-5 h-5" />, color: '#fca5a5' },
      { id: 'intake', label: 'Intake', icon: <PlusCircle className="w-5 h-5" />, color: '#fbbf24' },
    ];
    return tabs;
  }, []);

  const currentTabIndex = HOD_TABS.findIndex((t) => t.id === activeTab);

  const [estimatingJob, setEstimatingJob] = useState<Job | null>(null);

  const [members, setMembers] = useState<GarageMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [hodJobSummary, setHodJobSummary] = useState('');
  const [hodRejectionNote, setHodRejectionNote] = useState('');
  const [hodRejectionVoiceUrl, setHodRejectionVoiceUrl] = useState('');

  // Department & HOD Identity
  const effectiveDeptName = departmentName || 'Mechanical Bay & Diagnostics';
  const hodName = membership?.role === 'owner' ? 'Workshop Administrator' : (membership?.full_name || membership?.email?.split('@')[0] || 'Marcus Vance');

  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = `motologa_hod_notes_${garageId}_${departmentId || 'dept'}_${todayKey}`;

  // User-authored HOD Daily Notes State (now storing cloud URL)
  const [savedAudioUrl, setSavedAudioUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved || '';
    } catch {
      return '';
    }
  });
  
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`${storageKey}_time`) || null;
    } catch {
      return null;
    }
  });

  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNoteSentToOwner, setIsNoteSentToOwner] = useState(false);
  
  // Media Recorder States
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setAudioBlob(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingDuration(0);
        setAudioBlob(null);

        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error("Microphone error", err);
        showToast("Microphone access denied or unavailable.");
      }
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Initial floor jobs fallback
  const initialFloorJobs: Job[] = [
    {
      id: 'demo-job-1',
      licensePlate: 'LT 482 AB',
      vehicleModel: 'Toyota Hilux 2.8D',
      customerPhone: '+237 671 234 567',
      issueDescription: 'Front brake pads grinding & brake fluid replacement',
      mechanicAssigned: 'Tariq Ahmed',
      status: 'In Repair',
      partSource: 'Garage Stock',
      createdAt: Date.now() - 45 * 60000,
      timeElapsedMinutes: 45,
      laborFeeFcfa: 45000,
      released: false,
    },
    {
      id: 'demo-job-2',
      licensePlate: 'CE 915 CD',
      vehicleModel: 'Mercedes-Benz C200',
      customerPhone: '+237 699 876 543',
      issueDescription: 'Alternator belt screech & low battery voltage',
      mechanicAssigned: 'Alex Rivera',
      status: 'Work Done',
      workerCompleted: true,
      workerCompletedAt: Date.now() - 15 * 60000,
      partSource: 'Customer-Supplied Part',
      createdAt: Date.now() - 75 * 60000,
      timeElapsedMinutes: 75,
      laborFeeFcfa: 35000,
      released: false,
    },
    {
      id: 'demo-job-3',
      licensePlate: 'NW 204 XY',
      vehicleModel: 'Hyundai Santa Fe',
      customerPhone: '+237 655 432 109',
      issueDescription: 'Suspension bushing replacement & wheel balance',
      mechanicAssigned: 'Devonte Miller',
      status: 'Ready/Released',
      partSource: 'Garage Stock',
      createdAt: Date.now() - 120 * 60000,
      timeElapsedMinutes: 120,
      laborFeeFcfa: 55000,
      released: true,
    },
  ];

  const [floorJobs, setFloorJobs] = useState<Job[]>(
    passedJobs && passedJobs.length > 0 ? passedJobs : initialFloorJobs
  );

  useEffect(() => {
    if (passedJobs && passedJobs.length > 0) {
      setFloorJobs(passedJobs);
    }
  }, [passedJobs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [memberList, deptList] = await Promise.all([
        fetchGarageMembers(garageId),
        fetchDepartments(garageId),
      ]);
      setMembers(memberList);
      setDepartments(deptList);

      if (departmentId) {
        // Fetch all jobs and strictly filter locally based on the assigned mechanic's department_id mapping
        const { data: jobsData } = await supabase
          .from('jobs')
          .select(`*, job_media(*), mechanic:garage_members!jobs_assigned_to_fkey(full_name, email, department_id)`)
          .or('status.eq.IN_PROGRESS,and(status.eq.COMPLETED,hod_review_pending.eq.true)')
          .order('created_at', { ascending: false });

        let deptJobs: Record<string, unknown>[] = [];
        if (jobsData) {
          deptJobs = jobsData.filter((j: Record<string, unknown>) => {
            const mech = j.mechanic as { department_id?: string } | null;
            return mech?.department_id === departmentId;
          });
          setFloorJobs(deptJobs.map(mapDbJobToUiJob));
        }

        // Safe Department HOD Inbox Routing handled by CustomerOutboxScreen exclusively.
      }
    } catch (err) {
      console.error('Failed to load HOD data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [garageId, departmentId]);

  // Dept members with friendly fallback
  const rawDeptMembers = departmentId
    ? members.filter((m) => m.department_id === departmentId)
    : members;

  const fallbackDemoMembers: GarageMember[] = [
    {
      id: 'tech-01',
      garage_id: garageId || 'demo-garage',
      user_id: 'usr-01',
      role: 'worker',
      department_id: departmentId || 'dept-mech',
      full_name: 'Tariq Ahmed',
      email: 'tariq.ahmed@motologa.com',
    },
    {
      id: 'tech-02',
      garage_id: garageId || 'demo-garage',
      user_id: 'usr-02',
      role: 'worker',
      department_id: departmentId || 'dept-mech',
      full_name: 'Alex Rivera',
      email: 'alex.rivera@motologa.com',
    },
    {
      id: 'tech-03',
      garage_id: garageId || 'demo-garage',
      user_id: 'usr-03',
      role: 'worker',
      department_id: departmentId || 'dept-mech',
      full_name: 'Devonte Miller',
      email: 'devonte.m@motologa.com',
    },
  ];

  const deptMembers = rawDeptMembers.length > 0 ? rawDeptMembers : fallbackDemoMembers;

  const inBayCount = floorJobs.filter((j) => j.status === 'In Repair' || j.status === 'Diagnosis').length;
  const awaitingInspectionCount = floorJobs.filter(
    (j) => (j.status === 'Work Done' || Boolean(j.workerCompleted)) && j.status !== 'Ready/Released' && !j.inspectedByHod
  ).length;
  const readyCount = floorJobs.filter((j) => j.status === 'Ready/Released' || Boolean(j.inspectedByHod)).length;

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleMarkInspected = (job: Job) => {
    const isAlreadyInspected = (job.status === 'Ready/Released' || Boolean(job.inspectedByHod));
    if (isAlreadyInspected) {
      showToast(`${job.licensePlate} is already inspected and ready for release`);
      return;
    }

    const updated: Job = {
      ...job,
      status: 'Ready/Released',
      inspectedByHod: true,
      inspectedAt: Date.now(),
      inspectedBy: hodName,
      released: false, // Ready for cashier/owner release
    };
    setFloorJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
    onUpdateJob?.(updated);
    showToast(`Inspection Complete! ${job.licensePlate} is now in Ready for Release state.`);
  };

  const handleReopenJob = (job: Job) => {
    const updated: Job = {
      ...job,
      status: 'In Repair',
      inspectedByHod: false,
      workerCompleted: false,
      released: false,
    };
    setFloorJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
    onUpdateJob?.(updated);
    showToast(`${job.licensePlate} reopened back to In Repair.`);
  };

  const handleSendAudioReport = async () => {
    if (!audioBlob) {
      showToast('Please record an audio report first.');
      return;
    }

    setIsSavingNote(true);
    try {
      const fileName = `hod-reports/${garageId}/${departmentId}/${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('garage-media')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('garage-media')
        .getPublicUrl(fileName);

      const url = publicUrlData.publicUrl;

      // Save to UI and localstorage
      setSavedAudioUrl(url);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(storageKey, url);
      localStorage.setItem(`${storageKey}_time`, now);
      setLastSavedTime(now);

      setIsNoteSentToOwner(true);
      showToast('Audio Report sent to Workshop Owner!');
    } catch (err: any) {
      console.error('Error uploading report:', err);
      showToast('Failed to upload audio report. Try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-4 w-full h-full max-w-full pb-8">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-emerald-900 border border-emerald-400 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* 1. CLEAN TOP HEADER */}
      <div className="bg-stone-900/90 border border-stone-800/90 px-3.5 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-[#34D399] font-bold">
              Head of Department
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-base sm:text-lg font-black text-white truncate">
            {effectiveDeptName}
          </h1>
          <p className="text-xs text-stone-400 truncate">
            Lead: <span className="text-stone-200 font-medium">{hodName}</span>
          </p>
        </div>
        <button
          onClick={() => handleTabSelect('intake')}
          className="flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400 flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Register New Vehicle</span>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8 sm:p-12 text-stone-300 text-sm font-medium bg-stone-900 border border-stone-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 text-[#34D399] animate-spin mr-2" />
          Loading department data...
        </div>
      ) : (
        <>
          {activeTab === 'outbox' && (
            <CustomerOutboxScreen userRole="hod" garageId={garageId} departmentId={departmentId} garageName={garageName || 'MOTOLOGA GARAGE'} departmentName={effectiveDeptName} />
          )}
          
          {/* APPOINTMENTS & FUTURE RESERVATIONS TAB */}
          {activeTab === 'appointments' && (
            <div className="animate-in fade-in duration-200">
              <AppointmentsScreen
                garageId={garageId}
                departmentId={departmentId}
                departmentName={effectiveDeptName}
                mechanics={Array.from(new Set([
                  ...deptMembers.map((m) => m.role === 'owner' ? 'Workshop Administrator' : (m.full_name || m.email?.split('@')[0] || '')),
                  'Jean',
                  'Paul',
                  'Michel',
                  'Ibrahim'
                ]))}
                deferredRepairs={deferredRepairs}
                onConvertAppointmentToJob={async (appt) => {
                  const assignedJob: Job = {
                    id: `job-${Date.now()}`,
                    licensePlate: appt.vehiclePlate,
                    customerPhone: appt.customerPhone,
                    vehicleModel: appt.vehicleModel || 'Customer Vehicle',
                    mechanicAssigned: appt.mechanicAssigned && appt.mechanicAssigned !== 'Unassigned' ? appt.mechanicAssigned : 'Jean',
                    status: 'In Repair',
                    workerCompleted: false,
                    inspectedByHod: false,
                    released: false,
                    createdAt: Date.now(),
                    timeElapsedMinutes: 1,
                    partSource: 'Garage Stock',
                    laborFeeFcfa: 15000,
                    issueDescription: [
                      appt.notes || appt.serviceRequested || 'Scheduled Vehicle Reservation',
                      `Date: ${appt.appointmentDate}${appt.appointmentTime ? ` at ${appt.appointmentTime}` : ''}`,
                      appt.audioUrl ? '🎤 Voice note recorded by customer attached' : ''
                    ].filter(Boolean).join(' • '),
                  };

                  // 1. Add to floor
                  setFloorJobs((prev) => [assignedJob, ...prev.filter((j) => j.id !== assignedJob.id)]);

                  // 2. Propagate to App state
                  if (onAddJob) {
                    try {
                      await onAddJob(assignedJob);
                    } catch (e) {
                      console.warn('onAddJob error:', e);
                    }
                  } else if (onUpdateJob) {
                    onUpdateJob(assignedJob);
                  }

                  // 3. Persist to API
                  try {
                    await createJob(assignedJob, garageId, userId);
                  } catch (e) {
                    console.warn('createJob error:', e);
                  }

                  showToast(`Job card created for ${assignedJob.licensePlate} on floor & assigned to ${assignedJob.mechanicAssigned}!`);
                  handleTabSelect('queue');
                }}
                onNavigateToFloor={() => handleTabSelect('queue')}
              />
            </div>
          )}
          {/* INTAKE TAB */}
          {activeTab === 'intake' && (
            <div className="animate-in fade-in duration-200">
              <IntakeScreen
                garageId={garageId}
                availableMechanics={deptMembers}
                onNavigateToQueue={() => handleTabSelect('queue')}
                onJobCreated={async (newJob) => {
                  const jobId = newJob.id || `job-${Date.now()}`;
                  const assignedJob: Job = {
                    ...newJob,
                    id: jobId,
                    status: newJob.mechanicAssigned && newJob.mechanicAssigned !== 'Unassigned' ? 'In Repair' : 'Diagnosis',
                    workerCompleted: false,
                    inspectedByHod: false,
                    released: false,
                    createdAt: newJob.createdAt || Date.now(),
                    timeElapsedMinutes: 1,
                  };

                  // 1. Immediately create a new job card on the vehicles on floor
                  setFloorJobs((prev) => [assignedJob, ...prev.filter((j) => j.id !== assignedJob.id)]);

                  // 2. Propagate to App state
                  if (onAddJob) {
                    try {
                      await onAddJob(assignedJob);
                    } catch (e) {
                      console.warn('onAddJob warning:', e);
                    }
                  } else if (onUpdateJob) {
                    onUpdateJob(assignedJob);
                  }

                  // 3. Persist to API
                  try {
                    await createJob(assignedJob, garageId, userId);
                  } catch (e) {
                    console.warn('createJob fallback:', e);
                  }

                  showToast(`Job card created for ${assignedJob.licensePlate} on floor & assigned to ${assignedJob.mechanicAssigned}!`);
                  handleTabSelect('queue');
                }}
              />
            </div>
          )}

          {/* ROSTER TAB */}
          {activeTab === 'roster' && (
            <div className="animate-in fade-in duration-200">
              <RosterScreen
                members={members}
                departments={departments}
                userRole="hod"
                currentUserDepartmentId={departmentId}
                copiedLink={false}
                onCopyInviteLink={() => { }}
                onAssignDepartment={() => { }}
                onToggleHod={() => { }}
              />
            </div>
          )}

          {/* MAIN FLOOR & HOD NOTES */}
          {activeTab === 'queue' && (
            <div className="flex flex-col gap-3.5 sm:gap-4 animate-in fade-in duration-200">
              {/* 2. AT-A-GLANCE NUMBERS (Clean, High Contrast, Large Text) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-stone-900 border border-stone-800 p-2.5 sm:p-3.5 rounded-xl">
                  <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                    In Bays
                  </span>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-400 mt-0.5 sm:mt-1 font-mono">
                    {inBayCount}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-400 block truncate">Repairs active</span>
                </div>

                <div className={`border p-2.5 sm:p-3.5 rounded-xl transition-all ${awaitingInspectionCount > 0
                    ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                    : 'bg-stone-900 border-stone-800'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                      Need Inspection
                    </span>
                    {awaitingInspectionCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-400 mt-0.5 sm:mt-1 font-mono">
                    {awaitingInspectionCount}
                  </div>
                  <span className="text-[10px] sm:text-xs text-indigo-300/80 block truncate">Worker done ✓</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-2.5 sm:p-3.5 rounded-xl">
                  <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                    Ready
                  </span>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-[#34D399] mt-0.5 sm:mt-1 font-mono">
                    {readyCount}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-400 block truncate">Inspected / release</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-2.5 sm:p-3.5 rounded-xl">
                  <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                    Mechanics
                  </span>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-0.5 sm:mt-1 font-mono">
                    {deptMembers.length}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-400 block truncate">On shift today</span>
                </div>
              </div>

              {/* 3. USER-AUTHORED HOD DAILY WORK LOG (NOT RANDOM GENERATED) */}
              <div className="bg-stone-900 border border-stone-800 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-[#34D399] shrink-0" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                        HOD Daily Work Log & Summary
                      </h2>
                      <p className="text-[11px] sm:text-xs text-stone-400">
                        Write notes, issues encountered, or handovers for the day
                      </p>
                    </div>
                  </div>
                  {lastSavedTime && (
                    <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-950 px-2 sm:px-2.5 py-1 rounded-lg border border-stone-800 font-mono shrink-0">
                      Saved {lastSavedTime}
                    </span>
                  )}
                </div>

                {/* HOD Audio Recorder */}
                <div className="space-y-4">
                  {savedAudioUrl ? (
                    <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Today's Report Secured
                      </div>
                      <audio controls src={savedAudioUrl} className="w-full h-10 filter sepia hue-rotate-180 brightness-90 saturate-200" />
                      <button
                        onClick={() => {
                          setSavedAudioUrl('');
                          setAudioBlob(null);
                          setIsNoteSentToOwner(false);
                        }}
                        className="text-stone-500 hover:text-stone-300 text-xs text-left underline"
                      >
                        Record a new report instead
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {audioBlob ? (
                        <div className="bg-indigo-950/30 border border-indigo-900/50 p-4 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2"><FileAudio className="w-4 h-4"/> Report Preview</span>
                            <span className="text-xs text-stone-400 font-mono">{formatDuration(recordingDuration)}</span>
                          </div>
                          <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10 filter sepia hue-rotate-180 brightness-90 saturate-200" />
                          <button
                            onClick={() => { setAudioBlob(null); setRecordingDuration(0); }}
                            className="text-rose-400 hover:text-rose-300 text-xs text-left underline"
                          >
                            Discard & Re-record
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`w-full h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-md ${
                            isRecording
                              ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/20 shadow-xl border-2 border-rose-400 scale-[1.01]'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700 active:scale-95'
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <Square className="w-8 h-8" />
                              <span className="font-bold text-sm tracking-widest break-all px-2 text-center">RECORDING... {formatDuration(recordingDuration)}</span>
                              <span className="text-[10px] text-rose-200 uppercase tracking-widest font-black">Tap to Stop</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-8 h-8 opacity-80 text-sky-400" />
                              <span className="font-bold text-sm text-white">Start Voice Report</span>
                              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-black">Tap to Record</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!savedAudioUrl && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-stone-800">
                      <button
                        type="button"
                        onClick={handleSendAudioReport}
                        disabled={isSavingNote || !audioBlob}
                        className={`h-10 sm:h-11 px-4 sm:flex-1 font-black text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md ${
                          audioBlob 
                            ? 'bg-[#34D399] hover:bg-emerald-400 text-stone-950 cursor-pointer active:scale-95' 
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                        }`}
                      >
                        {isSavingNote ? (
                          <><RefreshCw className="w-5 h-5 animate-spin" /> Uploading...</>
                        ) : (
                          <><Send className="w-5 h-5" /> {isNoteSentToOwner ? 'Sent to Owner ✓' : 'Send Audio Report'}</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. ACTIVE VEHICLES / WORK ORDERS */}
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
                    <span>Jobs in Bay ({floorJobs.length})</span>
                  </h2>
                  <span className="text-[11px] sm:text-xs text-stone-400">
                    Tap to expand details
                  </span>
                </div>

                <div className="space-y-2.5">
                  {floorJobs.map((job) => {
                    const isPendingQC = job.status === 'Pending QC';
                    const isExpanded = expandedJobId === job.id;

                    return (
                      <div
                        key={job.id}
                        className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${isPendingQC
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                            : 'bg-stone-900 border-stone-800'
                          }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <LicensePlateBadge plate={job.licensePlate} size="md" />
                              <div className="mt-1">
                                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-0.5">Intake Issue:</span>
                                <p className="text-xs sm:text-sm text-stone-300 font-medium whitespace-pre-wrap">
                                  {job.issueDescription || 'Diagnostic & maintenance procedure'}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-2">
                              {isPendingQC ? (
                                <span className="text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/40 flex items-center gap-1.5 shadow-sm">
                                  <ShieldAlert className="w-3.5 h-3.5" /> Ready for QC Inspection
                                </span>
                              ) : (
                                <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border bg-stone-800 text-stone-400 border-stone-700">
                                  Waiting for Job Completion
                                </span>
                              )}
                              
                              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-stone-500" /> {job.mechanicAssigned || 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          {isPendingQC && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedJobId(isExpanded ? null : job.id);
                                setHodJobSummary(job.hodJobSummary || job.issueDescription || '');
                                setHodRejectionNote(job.hod_rejection_note || '');
                                setHodRejectionVoiceUrl(job.hod_voice_note_url || '');
                              }}
                              className={`mt-2 w-full min-h-[44px] rounded-xl ${isExpanded ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300' : 'bg-stone-800 hover:bg-stone-700 text-[#34D399] border-stone-700'} font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm border transition-all`}
                            >
                              <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                              <span>{isExpanded ? 'Close Inspection' : 'Inspect Job'}</span>
                            </button>
                          )}

                          {isExpanded && isPendingQC && (
                            <div className="mt-3 pt-4 border-t border-stone-800/60 animate-in slide-in-from-top-2 duration-200">
                              <h4 className="text-[11px] font-black uppercase text-stone-400 mb-3 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" /> Mechanic Proof of Work
                              </h4>
                              
                              <div className="space-y-4 mb-4 bg-stone-950/50 p-3 rounded-xl border border-stone-800/80">
                                <div className="bg-gray-800/50 p-3 rounded-md mb-2 border border-gray-700/50">
                                  <span className="text-[10px] font-black uppercase tracking-wider block mb-1 text-orange-400">Customer Reported Problem</span>
                                  <p className="text-sm font-medium text-stone-200 whitespace-pre-wrap">{job.issueDescription || "No intake description provided."}</p>
                                  {job.voiceNoteUrl && (
                                    <div className="mt-3">
                                      <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Intake Voice Note</span>
                                      <audio src={job.voiceNoteUrl} controls className="w-full h-10 mt-1.5 rounded-lg opacity-90" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Worker Notes</span>
                                  <p className="text-sm font-medium text-stone-200 mt-1.5 whitespace-pre-wrap">{job.workerNotes || "No manual notes provided."}</p>
                                </div>

                                {job.workerVoiceNoteUrl ? (
                                  <div>
                                    <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">Voice Memo</span>
                                    <audio src={job.workerVoiceNoteUrl} controls className="w-full h-10 mt-1.5 rounded-lg opacity-90" />
                                  </div>
                                ) : null}

                                {(job.oldPartPhotoUrl || job.newPartPhotoUrl) && (
                                  <div className="grid grid-cols-2 gap-3 mt-3">
                                      {job.oldPartPhotoUrl && (
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-black uppercase text-stone-500">Old Part</span>
                                          <img src={job.oldPartPhotoUrl} alt="Before" className="w-full h-24 object-cover rounded-md border border-stone-800" />
                                        </div>
                                      )}
                                      {job.newPartPhotoUrl && (
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-black uppercase text-stone-500">New Part</span>
                                          <img src={job.newPartPhotoUrl} alt="After" className="w-full h-24 object-cover rounded-md border border-emerald-900/40" />
                                        </div>
                                      )}
                                  </div>
                                )}
                                {job.generalJobPhotoUrl && (
                                  <div className="space-y-1 mt-3">
                                    <span className="text-[9px] font-black uppercase text-stone-500">General Photo</span>
                                    <img src={job.generalJobPhotoUrl} alt="General" className="w-full h-32 object-cover rounded-md border border-stone-800" />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4 mb-5 border-t border-stone-800/80 pt-4">
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> HOD Notes (Invoice Summary or Rejection Reason)
                                  </span>
                                  <textarea
                                    value={isExpanded ? (hodRejectionNote || hodJobSummary) : ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                      setHodJobSummary(e.target.value);
                                      setHodRejectionNote(e.target.value);
                                    }}
                                    placeholder="Type rejection reason for worker OR final invoice summary..."
                                    className="w-full rounded-xl bg-stone-950 border border-stone-700 p-3 text-sm font-medium text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[90px]"
                                  />
                                </div>
                                <div className="bg-stone-900/50 p-1 rounded-xl">
                                  <VoiceRecorderField
                                    audioUrl={hodRejectionVoiceUrl}
                                    durationSeconds={0}
                                    onAudioChange={(url) => setHodRejectionVoiceUrl(url)}
                                    label="HOD Voice Feedback"
                                    promptTitle="Record Voice Feedback"
                                    promptSubtitle="Speak the reason for rejection or worker instructions."
                                    buttonId={`record-hod-voice-${job.id}`}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={async () => {
                                    const { error } = await supabase.from('jobs').update({ hod_review_pending: false, hod_job_summary: hodJobSummary, hod_name: hodName, completed_at: new Date().toISOString() }).eq('id', job.id);
                                    if (!error) {
                                      const nextJob = { ...job, status: 'Ready/Released' as JobStatus, hodJobSummary };
                                      setFloorJobs(prev => prev.filter(j => j.id !== job.id)); 
                                      onUpdateJob?.(nextJob);
                                      setExpandedJobId(null);
                                      setHodJobSummary('');
                                      setHodRejectionNote('');
                                      setHodRejectionVoiceUrl('');
                                      setSuccessToast("Job Approved & Sent to Checkout!");
                                      setTimeout(() => setSuccessToast(null), 3500);
                                    } else {
                                      console.error(error);
                                      alert("DB Error: " + error.message);
                                    }
                                  }}
                                  className="bg-emerald-500 active:scale-95 hover:bg-emerald-600 border border-emerald-600 text-white font-black text-xs md:text-sm min-h-[44px] rounded-xl w-full transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                  <span>Approve to Owner</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    let finalHodVoiceUrl = hodRejectionVoiceUrl;
                                    if (finalHodVoiceUrl && (finalHodVoiceUrl.startsWith('data:') || finalHodVoiceUrl.startsWith('blob:'))) {
                                      try {
                                        const res = await fetch(finalHodVoiceUrl);
                                        const blob = await res.blob();
                                        const filePath = `${job.id}/hod_reject_voice_${Date.now()}.webm`; 
                                        const { error: uploadErr } = await supabase.storage.from('garage-media').upload(filePath, blob, { contentType: blob.type });
                                        if (!uploadErr) {
                                          const { data } = supabase.storage.from('garage-media').getPublicUrl(filePath);
                                          finalHodVoiceUrl = data.publicUrl;
                                        }
                                      } catch(e) {}
                                    }

                                    const { error } = await supabase.from('jobs').update({ 
                                      status: 'IN_PROGRESS', 
                                      hod_review_pending: false,
                                      hod_rejection_note: hodRejectionNote,
                                      hod_voice_note_url: finalHodVoiceUrl,
                                      hod_name: hodName
                                    }).eq('id', job.id);
                                    
                                    if (!error) {
                                      const nextJob = { ...job, status: 'In Repair' as JobStatus, hod_rejection_note: hodRejectionNote, hod_voice_note_url: finalHodVoiceUrl };
                                      setFloorJobs(prev => prev.map(j => j.id === job.id ? nextJob : j));
                                      onUpdateJob?.(nextJob);
                                      setExpandedJobId(null);
                                      setHodRejectionNote('');
                                      setHodRejectionVoiceUrl('');
                                      setHodJobSummary('');
                                      setSuccessToast("Job Rejected back to Bay.");
                                      setTimeout(() => setSuccessToast(null), 3500);
                                    } else {
                                      console.error(error);
                                      alert("DB Error: " + error.message);
                                    }
                                  }}
                                  className="bg-stone-800 active:scale-95 border border-rose-900 hover:bg-rose-950 hover:border-rose-800 text-rose-500 font-extrabold text-xs md:text-sm min-h-[44px] rounded-xl w-full transition-all flex items-center justify-center gap-1.5"
                                >
                                  <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                                  <span>Reject to Bay</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. MECHANICS ON SHIFT (Clean & Simple) */}
              <div className="bg-stone-900 border border-stone-800 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
                    <span>Mechanics in {effectiveDeptName}</span>
                  </h2>
                  <span className="text-xs text-[#34D399] font-medium">
                    {deptMembers.length} Active
                  </span>
                </div>

                <div className="space-y-2">
                  {deptMembers.map((m, index) => {
                    const name = m.role === 'owner' ? 'Workshop Administrator' : (m.full_name || m.email?.split('@')[0] || '');
                    const isHod = m.is_hod;
                    const bay = `Bay ${index + 1}`;

                    return (
                      <div
                        key={m.id || index}
                        className="bg-stone-950 p-2.5 sm:p-3 rounded-xl border border-stone-800/80 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{name}</span>
                              {isHod && (
                                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">
                                  HOD
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs text-stone-400 block truncate">
                              {bay} • {isHod ? 'Lead Diagnostic' : 'Service Mechanic'}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-emerald-400 bg-emerald-950/60 px-2 sm:px-2.5 py-1 rounded-lg border border-emerald-900 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* FIXED BOTTOM COMPONENT ISLAND */}
      {!hideTopNav && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full sm:w-[95%] max-w-lg px-2">
          <AnimatedTabBar 
            items={HOD_TABS}
            activeIndex={currentTabIndex >= 0 ? currentTabIndex : 0}
            onTabChange={(index) => handleTabSelect(HOD_TABS[index].id as any)}
          />
        </div>
      )}

      {/* ESTIMATE MODAL */}
      {estimatingJob && (
        <InvoiceGenerator
          garageName={garageName || 'MOTOLOGA GARAGE'}
          departmentName={effectiveDeptName}
          job={estimatingJob}
          documentType="ESTIMATE"
          onClose={() => setEstimatingJob(null)}
          onConfirmPrint={() => {
            const waText = `Hello, our technicians have found additional work required on your vehicle. Please review the attached estimate and reply 'APPROVED' so we can proceed with the repair.`;
            let cleanPhone = estimatingJob.customerPhone.replace(/\D/g, '');
            if (cleanPhone.startsWith('237')) cleanPhone = cleanPhone.slice(3);
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
            const waUrl = `https://wa.me/237${cleanPhone}?text=${encodeURIComponent(waText)}`;
            
            try {
              window.open(waUrl, '_blank', 'noopener,noreferrer');
            } catch (e) {
              console.log('Unable to auto-open window', e);
            }
            
            // Close WITHOUT triggering any database updates, per the strict safeguard rule
            setEstimatingJob(null);
          }}
        />
      )}
    </div>
  );
};

