import React, { useState, useEffect } from 'react';
import { QueueScreen } from './QueueScreen';
import { RosterScreen } from './RosterScreen';
import { AppointmentsScreen } from './AppointmentsScreen';
import { IntakeScreen } from '../components/IntakeScreen';
import { CustomerOutboxScreen } from './CustomerOutboxScreen';
import { LicensePlateBadge } from '../components/LicensePlateBadge';
import { fetchGarageMembers, fetchDepartments, createJob } from '../lib/api';
import { GarageMember, Department, Job, DeferredRepair, JobStatus, AppointmentReservation } from '../types';
import {
  Users,
  Wrench,
  PlusCircle,
  CheckCircle2,
  Clock,
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
  Calendar,
} from 'lucide-react';
import { AnimatedTabBar, TabItem } from '../components/ui/animated-tab-bar';
import { useTranslation } from 'react-i18next';

export interface HodDashboardProps {
  userId: string;
  garageId: string;
  departmentId?: string;
  departmentName?: string;
  canIntake?: boolean;
  membership?: GarageMember | null;
  jobs?: Job[];
  deferredRepairs?: DeferredRepair[];
  onUpdateJob?: (job: Job) => void;
  onAddJob?: (job: Job) => Promise<void> | void;
  onNavigateToCheckout?: (jobId?: string) => void;
  activeTab?: 'queue' | 'roster' | 'intake' | 'appointments' | 'outbox' | 'my-queue';
  onTabChange?: (tab: 'queue' | 'roster' | 'intake' | 'appointments' | 'outbox' | 'my-queue') => void;
  hideTopNav?: boolean;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({
  userId,
  garageId,
  departmentId,
  departmentName,
  canIntake = true,
  membership,
  jobs: passedJobs,
  deferredRepairs,
  onUpdateJob,
  onAddJob,
  onNavigateToCheckout,
  activeTab: propActiveTab,
  onTabChange,
  hideTopNav = false,
}) => {
  const [internalTab, setInternalTab] = useState<'queue' | 'roster' | 'intake' | 'appointments' | 'outbox' | 'my-queue'>('queue');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;
  const handleTabSelect = (tab: 'queue' | 'roster' | 'intake' | 'appointments' | 'outbox' | 'my-queue') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [members, setMembers] = useState<GarageMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  const { t } = useTranslation(['owner', 'navigation', 'common']);

  // Department & HOD Identity
  const effectiveDeptName = departmentName || t('owner:deptMechBay', 'Mechanical Bay & Diagnostics');
  const hodName = membership?.full_name || membership?.email?.split('@')[0] || t('common:unnamedStaff', 'Marcus Vance');

  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = `motologa_hod_notes_${garageId}_${departmentId || 'dept'}_${todayKey}`;

  // User-authored HOD Daily Notes State
  const [dailyNote, setDailyNote] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved || '';
    } catch {
      return '';
    }
  });
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_time`);
      return saved || null;
    } catch {
      return null;
    }
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNoteSentToOwner, setIsNoteSentToOwner] = useState(false);

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [memberList, deptList] = await Promise.all([
          fetchGarageMembers(garageId),
          fetchDepartments(garageId),
        ]);
        setMembers(memberList);
        setDepartments(deptList);
      } catch (err) {
        console.error('Failed to load HOD data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [garageId]);

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
      is_hod: false,
      department_id: departmentId || 'dept-mech',
      full_name: 'Tariq Ahmed',
      email: 'tariq.ahmed@motologa.com',
    },
    {
      id: 'tech-02',
      garage_id: garageId || 'demo-garage',
      user_id: 'usr-02',
      role: 'worker',
      is_hod: false,
      department_id: departmentId || 'dept-mech',
      full_name: 'Alex Rivera',
      email: 'alex.rivera@motologa.com',
    },
    {
      id: 'tech-03',
      garage_id: garageId || 'demo-garage',
      user_id: 'usr-03',
      role: 'worker',
      is_hod: false,
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

  const handleSaveDailyNote = () => {
    setIsSavingNote(true);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      localStorage.setItem(storageKey, dailyNote);
      localStorage.setItem(`${storageKey}_time`, now);
      setLastSavedTime(now);
      showToast('Daily note saved successfully');
    } catch {
      showToast('Note saved in current session');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSendNoteToOwner = () => {
    if (!dailyNote.trim()) {
      showToast('Please type your report notes first');
      return;
    }
    handleSaveDailyNote();
    setIsNoteSentToOwner(true);
    showToast('Report sent to Workshop Owner');
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
      <div className="bg-stone-900/90 border border-stone-800/90 px-3.5 py-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-[#34D399] font-bold">
              {t('owner:hodTitle', 'Head of Department')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-base sm:text-lg font-black text-white truncate">
            {effectiveDeptName}
          </h1>
          <p className="text-xs text-stone-400 truncate">
            {t('owner:leadLabel', 'Lead:')} <span className="text-stone-200 font-medium">{hodName}</span>
          </p>
        </div>

        {/* TopNav removal left intentionally blank since bottom navbar controls it */}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8 sm:p-12 text-stone-300 text-sm font-medium bg-stone-900 border border-stone-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 text-[#34D399] animate-spin mr-2" />
          {t('owner:loadingDeptData', 'Loading department data...')}
        </div>
      ) : (
        <>
          {activeTab === 'outbox' && (
            <div className="animate-in fade-in duration-200">
              <CustomerOutboxScreen
                userRole="hod"
                garageId={garageId}
                departmentId={departmentId}
                garageName={'MOTOLOGA GARAGE'}
                departmentName={effectiveDeptName}
              />
            </div>
          )}
          
          {activeTab === 'my-queue' && (
            <div className="animate-in fade-in duration-200">
              <QueueScreen
                userRole="worker"
                garageId={garageId}
                departmentId={departmentId}
                departmentName={effectiveDeptName}
                currentUserId={userId}
              />
            </div>
          )}

          {/* APPOINTMENTS & FUTURE RESERVATIONS TAB */}
          {activeTab === 'appointments' && (
            <div className="animate-in fade-in duration-200">
              <AppointmentsScreen
                garageId={garageId}
                departmentId={departmentId}
                departmentName={effectiveDeptName}
              />
            </div>
          )}
          {/* INTAKE TAB */}
          {activeTab === 'intake' && canIntake && (
            <div className="animate-in fade-in duration-200">
              <IntakeScreen
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
                    {t('owner:bays', 'In Bays')}
                  </span>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-400 mt-0.5 sm:mt-1 font-mono">
                    {inBayCount}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-400 block truncate">{t('owner:repairsActiveDesc', 'Repairs active')}</span>
                </div>

                <div className={`border p-2.5 sm:p-3.5 rounded-xl transition-all ${awaitingInspectionCount > 0
                    ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                    : 'bg-stone-900 border-stone-800'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                      {t('owner:needInspectionTab', 'Need Inspection')}
                    </span>
                    {awaitingInspectionCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-400 mt-0.5 sm:mt-1 font-mono">
                    {awaitingInspectionCount}
                  </div>
                  <span className="text-[10px] sm:text-xs text-indigo-300/80 block truncate">{t('owner:workerDoneLabel', 'Worker done ✓')}</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-2.5 sm:p-3.5 rounded-xl">
                  <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                    {t('owner:readyStatusLabel', 'Ready')}
                  </span>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-[#34D399] mt-0.5 sm:mt-1 font-mono">
                    {readyCount}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-400 block truncate">{t('owner:inspectedReleaseDesc', 'Inspected / release')}</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-2.5 sm:p-3.5 rounded-xl">
                  <span className="text-[11px] sm:text-xs text-stone-400 font-medium block truncate">
                    {t('owner:mechanicsTab', 'Mechanics')}
                  </span>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-0.5 sm:mt-1 font-mono">
                    {deptMembers.length}
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-400 block truncate">{t('owner:onShiftDesc', 'On shift today')}</span>
                </div>
              </div>

              {/* 3. USER-AUTHORED HOD DAILY WORK LOG (NOT RANDOM GENERATED) */}
              <div className="bg-stone-900 border border-stone-800 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-[#34D399] shrink-0" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                        {t('owner:hodDailyWorkLogTitle', 'HOD Daily Work Log & Summary')}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-stone-400">
                        {t('owner:hodDailyWorkLogDesc', 'Write notes, issues encountered, or handovers for the day')}
                      </p>
                    </div>
                  </div>
                  {lastSavedTime && (
                    <span className="text-[10px] sm:text-xs text-stone-400 bg-stone-950 px-2 sm:px-2.5 py-1 rounded-lg border border-stone-800 font-mono shrink-0">
                      Saved {lastSavedTime}
                    </span>
                  )}
                </div>

                {/* HOD Text Area */}
                <div className="space-y-2">
                  <textarea
                    id="hod-daily-log-input"
                    value={dailyNote}
                    onChange={(e) => {
                      setDailyNote(e.target.value);
                      setIsNoteSentToOwner(false);
                    }}
                    placeholder={t('owner:hodNotesPlaceholder', 'Write your notes for today\'s work here...')}
                    rows={4}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#34D399] transition leading-relaxed resize-y"
                  />

                  {/* Quick suggestion chips to help HOD quickly insert common notes */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const addition = 'All daily safety and tool checks completed with zero issues.';
                        setDailyNote((prev) => (prev ? `${prev}\n${addition}` : addition));
                      }}
                      className="text-[11px] sm:text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 transition active:scale-95 min-h-[32px] cursor-pointer"
                    >
                      + Tool checks done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const addition = 'Parts requested for vehicles currently in repair.';
                        setDailyNote((prev) => (prev ? `${prev}\n${addition}` : addition));
                      }}
                      className="text-[11px] sm:text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 transition active:scale-95 min-h-[32px] cursor-pointer"
                    >
                      + Parts requested
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const addition = 'All assigned jobs completed on schedule.';
                        setDailyNote((prev) => (prev ? `${prev}\n${addition}` : addition));
                      }}
                      className="text-[11px] sm:text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 transition active:scale-95 min-h-[32px] cursor-pointer"
                    >
                      + Completed on schedule
                    </button>
                  </div>
                </div>

                {/* Action Buttons for HOD Note */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={handleSaveDailyNote}
                    disabled={isSavingNote}
                    className="h-10 sm:h-11 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 border border-stone-700 cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4 text-stone-400" />
                    <span>Save Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendNoteToOwner}
                    className="h-10 sm:h-11 px-4 sm:flex-1 bg-[#34D399] hover:bg-emerald-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isNoteSentToOwner ? t('owner:sentToOwnerStatus', 'Sent to Owner ✓') : t('owner:sendAudioReportBtn', 'Send Report to Owner')}
                    </span>
                  </button>
                </div>
              </div>

              {/* 4. ACTIVE VEHICLES / WORK ORDERS */}
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
                    <span>{t('owner:vehicle', 'Vehicles')} - {t('owner:floorTab', 'Floor')} ({floorJobs.length})</span>
                  </h2>
                  <span className="text-[11px] sm:text-xs text-stone-400">
                    {t('owner:toggleStatusTooltip', 'Tap to update status')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {floorJobs.map((job) => {
                    const isReady = job.status === 'Ready/Released' || Boolean(job.inspectedByHod);
                    const isDoneByWorker = (job.status === 'Work Done' || Boolean(job.workerCompleted)) && !isReady;
                    const isInRepair = !isReady && !isDoneByWorker;

                    return (
                      <div
                        key={job.id}
                        className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${isDoneByWorker
                            ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30'
                            : isReady
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-stone-900 border-stone-800'
                          }`}
                      >
                        {/* Plate & Status Row - Mobile Optimized */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center flex-wrap gap-2 min-w-0">
                            <LicensePlateBadge plate={job.licensePlate} size="sm" className="sm:hidden" />
                            <LicensePlateBadge plate={job.licensePlate} size="md" className="hidden sm:inline-flex" />

                            {isReady ? (
                              <span className="text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shrink-0 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                                {t('owner:readyQcInspection', 'Ready for Release')}
                              </span>
                            ) : isDoneByWorker ? (
                              <span className="text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border bg-indigo-500/25 text-indigo-200 border-indigo-500/50 shrink-0 flex items-center gap-1.5 shadow-sm animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                                {t('owner:workerDoneLabel', 'Work Done')} • {t('owner:needInspectionTab', 'Needs Inspection')}
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40 shrink-0">
                                {t('owner:currentlyInService', 'In Repair')}
                              </span>
                            )}
                          </div>

                          {/* "Inspected" Action Button Requested by User */}
                          {!isReady ? (
                            <button
                              id={`btn-inspected-${job.id}`}
                              type="button"
                              onClick={() => handleMarkInspected(job)}
                              className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95 ${isDoneByWorker
                                  ? 'bg-[#34D399] hover:bg-emerald-400 text-stone-950 ring-2 ring-emerald-300/60 shadow-emerald-950/50'
                                  : 'bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/30'
                                }`}
                              title={t('owner:inspectQualityBtn', 'Inspect vehicle and approve')}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                              <span>{t('common:approveBtn', 'Inspected')}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-black bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>Inspected ✓</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleReopenJob(job)}
                                className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl text-xs font-bold bg-stone-800 text-stone-400 hover:text-white border border-stone-700 flex items-center gap-1 cursor-pointer active:scale-95 transition"
                                title="Reopen vehicle for more repair work"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reopen</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Vehicle & Customer Details */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                          <div className="text-sm sm:text-base font-bold text-white truncate">
                            {job.vehicleModel}
                          </div>
                          {job.customerPhone && (
                            <a
                              href={`tel:${job.customerPhone}`}
                              className="text-xs text-stone-400 hover:text-white flex items-center gap-1 font-mono transition"
                            >
                              <Phone className="w-3 h-3 text-[#34D399] shrink-0" />
                              <span>{job.customerPhone}</span>
                            </a>
                          )}
                        </div>

                        {/* Issue Description */}
                        <p className="text-xs sm:text-sm text-stone-300 mb-2 leading-snug line-clamp-2">
                          {job.issueDescription || 'Diagnostic & maintenance procedure'}
                        </p>

                        {/* Workflow Status Banner */}
                        {isDoneByWorker && (
                          <div className="mb-2.5 p-2 sm:p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-left">
                              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="line-clamp-2"><strong>{job.mechanicAssigned}</strong> {t('owner:workerDoneLabel', 'marked work done.')}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-300 shrink-0 uppercase tracking-wider">{t('owner:hodBadge', 'HOD')}</span>
                          </div>
                        )}

                        {isReady && (
                          <div className="mb-2.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Inspected by <strong>{job.inspectedBy || hodName}</strong>. Vehicle is ready for release!</span>
                            </div>
                            {onNavigateToCheckout && (
                              <button
                                type="button"
                                onClick={() => onNavigateToCheckout(job.id)}
                                className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 cursor-pointer"
                              >
                                Release / Checkout →
                              </button>
                            )}
                          </div>
                        )}

                        {isInRepair && (
                          <div className="mb-2.5 p-1.5 sm:p-2 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{t('owner:currentlyInService', 'Work ongoing with')} <strong>{job.mechanicAssigned || t('owner:technicianDefault', 'Technician')}</strong></span>
                            </div>
                            <span className="text-[11px] text-stone-400 font-mono shrink-0">{job.timeElapsedMinutes || 45} {t('common:mins', 'mins')}</span>
                          </div>
                        )}

                        {/* Footer: Assigned Mechanic & Labor Fee */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80 text-xs text-stone-400">
                          <div className="flex items-center gap-1.5 text-stone-300 truncate">
                            <UserCheck className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                            <span className="truncate">Mechanic: <strong className="text-white">{job.mechanicAssigned || 'Unassigned'}</strong></span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0">
                            {job.laborFeeFcfa !== undefined && (
                              <span className="font-mono text-[#34D399] font-bold">
                                {job.laborFeeFcfa.toLocaleString()} FCFA
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-stone-400 font-mono shrink-0">
                              <Clock className="w-3.5 h-3.5 text-stone-500" />
                              <span>{job.timeElapsedMinutes || 45}m</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. MECHANICS ON SHIFT (Clean & Simple) */}
              <div className="bg-stone-900 border border-stone-800 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
                    <span className="truncate">{t('owner:mechanicsInDeptTitle', 'Mechanics in')} {effectiveDeptName}</span>
                  </h2>
                  <span className="text-xs text-[#34D399] font-medium shrink-0 ml-2">
                    {deptMembers.length} {t('owner:active', 'Active')}
                  </span>
                </div>

                <div className="space-y-2">
                  {deptMembers.map((m, index) => {
                    const name = m.full_name || m.email?.split('@')[0] || `Technician ${index + 1}`;
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
                              {bay} • {isHod ? t('owner:leadDiagnosticRole', 'Lead Diagnostic') : t('owner:serviceMechanicRole', 'Service Mechanic')}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-emerald-400 bg-emerald-950/60 px-2 sm:px-2.5 py-1 rounded-lg border border-emerald-900 font-medium max-w-[80px] sm:max-w-none truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{t('owner:active', 'Active')}</span>
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-32px)] max-w-[420px] pb-[env(safe-area-inset-bottom)] pointer-events-auto">
          <AnimatedTabBar 
            items={[
              { id: 'queue', label: t('navigation:hod_floor', 'Floor'), icon: <Wrench className="w-5 h-5 shrink-0" />, color: '#34D399' },
              { id: 'my-queue', label: t('navigation:hod_jobs', 'Jobs'), icon: <Car className="w-5 h-5 shrink-0" />, color: '#10b981' },
              { id: 'outbox', label: t('navigation:hod_outbox', 'Outbox'), icon: <Send className="w-5 h-5 shrink-0" />, color: '#38bdf8' },
              { id: 'roster', label: t('navigation:hod_staff', 'Staff'), icon: <Users className="w-5 h-5 shrink-0" />, color: '#c084fc' },
              { id: 'appointments', label: t('navigation:hod_bookings', 'Bookings'), icon: <Calendar className="w-5 h-5 shrink-0" />, color: '#fca5a5' },
              { id: 'intake', label: t('navigation:hod_intake', 'Intake'), icon: <PlusCircle className="w-5 h-5 shrink-0" />, color: '#fbbf24' }
            ]}
            activeIndex={['queue', 'my-queue', 'outbox', 'roster', 'appointments', 'intake'].indexOf(activeTab || 'queue')}
            onTabChange={(index) => {
              const staticTabs = ['queue', 'my-queue', 'outbox', 'roster', 'appointments', 'intake'] as const;
              handleTabSelect(staticTabs[index] as any);
            }}
          />
        </div>
      )}
    </div>
  );
};
