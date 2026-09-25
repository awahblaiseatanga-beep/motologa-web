import React, { useState, useEffect, useMemo } from 'react';
import { Garage, Job, DeferredRepair, Department, GarageMember } from '../types';
import {
  fetchDepartments,
  createDepartment,
  deleteDepartment,
  fetchGarageMembers,
  updateMemberDepartment,
  updateMemberRole,
  fetchJobsForGarage,
  fetchDeferredRepairs,
  createJob,
  updateJobStatus,
  createDeferredRepair
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { IntakeScreen } from '../components/IntakeScreen';
import { CheckoutScreen } from '../components/CheckoutScreen';
import { MechanicQueueScreen } from '../components/MechanicQueueScreen';
import { AppointmentsScreen } from './AppointmentsScreen';
import { RosterScreen } from './RosterScreen';
import { AnimatedTabBar, TabItem } from '../components/ui/animated-tab-bar';
import {
  BarChart3,
  Building2,
  Users,
  Plus,
  Trash2,
  Crown,
  Share2,
  Check,
  Copy,
  Clock,
  Car,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Wrench,
  Receipt,
  ChevronDown,
  Link2,
  DollarSign,
  Send,
  CheckCircle,
  Calendar
} from 'lucide-react';

export interface OwnerAnalyticsMetrics {
  totalRevenueFcfa: number;
  activeJobsCount: number;
  pendingDeferredRepairsCount: number;
  totalStaffCount: number;
  monthlyGrowthPercent?: number;
  completedJobsCount?: number;
}

export interface OwnerDashboardProps {
  garage: Garage;
  activeScreen?: string;
}

export type ManagementTab = 'analytics' | 'structure' | 'intake' | 'queue' | 'checkout' | 'appointments';

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ garage, activeScreen = 'analytics' }) => {
  // External layout engine drives the screen renders
  const OWNER_TABS = useMemo(() => {
    const tabs: TabItem[] = [
      { id: 'analytics', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" />, color: '#34d399' },
      { id: 'structure', label: 'Bays', icon: <Building2 className="w-5 h-5" />, color: '#f43f5e' },
      { id: 'queue', label: 'JOBS', icon: <Wrench className="w-5 h-5" />, color: '#10b981' },
      { id: 'intake', label: 'Register', icon: <PlusCircle className="w-5 h-5" />, color: '#f59e0b' },
      { id: 'checkout', label: 'Exit', icon: <Receipt className="w-5 h-5" />, color: '#0ea5e9' },
      { id: 'appointments', label: 'Appointments', icon: <Calendar className="w-5 h-5" />, color: '#8b5cf6' },
    ];
    return tabs;
  }, []);

  const currentTabIndex = OWNER_TABS.findIndex((t) => t.id === activeScreen);

  
  // Data State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<GarageMember[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [deferredRepairs, setDeferredRepairs] = useState<DeferredRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Department creation state
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Invite Link feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Initial Load
  const loadData = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [deptList, memberList, garageJobs] = await Promise.all([
        fetchDepartments(garage.id),
        fetchGarageMembers(garage.id),
        fetchJobsForGarage(garage.id)
      ]);
      setDepartments(deptList);
      setMembers(memberList);
      setJobs(garageJobs);

      const jobIds = garageJobs.map(j => j.id);
      if (jobIds.length > 0) {
        const repairs = await fetchDeferredRepairs(jobIds);
        setDeferredRepairs(repairs);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [garage.id, activeScreen]);

  // Operational Mutations
  const handleCreateJob = async (newJob: Job, assignedToId: string) => {
    const data = await createJob(newJob, garage.id, assignedToId);
    setJobs(prev => [{...newJob, id: data.id}, ...prev]);
  };

  const handleUpdateJob = async (updatedJob: Job) => {
    await updateJobStatus(updatedJob.id, updatedJob.status, updatedJob.laborFeeFcfa);
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleReleaseJob = async (job: Job, finalFee: number) => {
    // CheckoutScreen.tsx already triggers the terminal Supabase '{ status: 'completed' }' API call. 
    // We only need to physically drop it from the DOM locally.
    setJobs(prev => prev.filter(j => j.id !== job.id));
  };

  const handleAddDeferredRepair = async (repair: DeferredRepair, jobId: string) => {
    const data = await createDeferredRepair(repair, jobId);
    setDeferredRepairs(prev => [...prev, {...repair, id: data.id}]);
  };

  // Department / Member Actions
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    setIsSubmittingDept(true);
    setDeptError(null);
    try {
      const newDept = await createDepartment(garage.id, deptName.trim(), deptDesc.trim());
      setDepartments((prev) => [...prev, newDept]);
      setDeptName('');
      setDeptDesc('');
    } catch (err: any) {
      setDeptError(err.message || 'Failed to create department');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department? Members in this department will become unassigned.')) return;
    try {
      await deleteDepartment(deptId);
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
      setMembers((prev) =>
        prev.map((m) => (m.department_id === deptId ? { ...m, department_id: null, role: 'worker' } : m))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
    }
  };

  const handleAssignDepartment = async (memberId: string, newDeptId: string | null) => {
    try {
      await updateMemberDepartment(memberId, newDeptId);
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            const matchedDept = departments.find((d) => d.id === newDeptId);
            return {
              ...m,
              department_id: newDeptId,
              role: newDeptId ? m.role : 'worker',
              departments: matchedDept,
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Failed to assign department');
    }
  };

  const handleToggleHod = async (member: GarageMember) => {
    if (!member.department_id && member.role !== 'hod') {
      alert('Please assign a department to this staff member first before promoting to HOD.');
      return;
    }

    const nextRole = member.role === 'hod' ? 'worker' : 'hod';
    try {
      await updateMemberRole(member.id, nextRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update HOD designation');
    }
  };


  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?invite=${garage.id}`
    : `/join?invite=${garage.id}`;

  const handleCopyInviteLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // KPI Calculations
  const recordedRevenue = jobs
    .filter((j) => j.released)
    .reduce((sum, j) => sum + (j.laborFeeFcfa || 0), 0);
  const mockBaselineRevenue = 0;
  const totalRevenue = recordedRevenue > 0 ? recordedRevenue + mockBaselineRevenue : mockBaselineRevenue;

  const metrics: OwnerAnalyticsMetrics = {
    totalRevenueFcfa: totalRevenue,
    activeJobsCount: jobs.filter((j) => !j.released).length,
    pendingDeferredRepairsCount: deferredRepairs.filter((r) => r.status === 'pending').length,
    totalStaffCount: members.length,
    monthlyGrowthPercent: 14.8,
    completedJobsCount: jobs.filter((j) => j.released).length,
  };

  return (
    <div className="space-y-6 pb-8 h-full overflow-y-auto">
      {/* 1. MASTER NAVIGATION SHELL */}
      <nav className="bg-stone-900/90 border border-stone-800 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 px-3 py-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#34D399] font-black text-sm">
            {garage.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#34D399] flex items-center gap-1.5 font-bold">
              <span>Owner Command</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-sm font-black text-white truncate max-w-[220px]">
              {garage.name}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. TAB RENDERER */}

      {activeScreen === 'intake' && (
        <div className="animate-in fade-in duration-200">
           <IntakeScreen garageId={garage.id} availableMechanics={members} onNavigateToQueue={() => {}} onJobCreated={handleCreateJob} />
        </div>
      )}

      {activeScreen === 'bays' && (
         <div className="animate-in fade-in duration-200">
            <MechanicQueueScreen
              jobs={jobs}
              deferredRepairs={deferredRepairs}
              onUpdateJob={handleUpdateJob}
              onNavigateToCheckout={() => {}}
              onSyncBay={async () => { await loadData(true); }}
            />
         </div>
      )}

      {activeScreen === 'checkout' && (
         <div className="animate-in fade-in duration-200">
            <CheckoutScreen
               jobs={jobs}
               todayRevenue={totalRevenue}
               garageName={garage.name}
               garageId={garage.id}
               onUpdateJob={handleUpdateJob}
               onJobReleased={handleReleaseJob}
               onAddDeferredRepair={handleAddDeferredRepair}
            />
         </div>
      )}

      {activeScreen === 'appointments' && (
        <div className="animate-in fade-in duration-200">
           <AppointmentsScreen
              garageId={garage.id}
              userRole="owner"
              departments={departments}
           />
        </div>
      )}

      {activeScreen === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-emerald-950/70 via-stone-900 to-stone-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-[#34D399]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-500/20 text-[#34D399]">
                    <Link2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Garage Invite Link
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Onboarding Active
                  </span>
                </div>
                <p className="text-xs text-stone-300 max-w-xl">
                  Share this onboarding link with technicians and department leads to register them directly under <span className="text-white font-semibold">{garage.name}</span>.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-stone-950/80 border border-stone-800 rounded-xl p-1.5 pl-3 self-stretch md:self-auto min-w-[280px]">
                <span className="text-xs font-mono text-emerald-400 truncate flex-1">
                  {inviteUrl}
                </span>
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3 py-1.5 bg-[#34D399] hover:bg-emerald-400 text-stone-950 rounded-lg text-xs font-black transition flex items-center gap-1.5 shrink-0 shadow"
                >
                  {copiedLink ? (
                    <><Check className="w-3.5 h-3.5" /><span>Copied!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Copy Link</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-[#34D399] border border-emerald-500/20">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">
                {metrics.totalRevenueFcfa.toLocaleString()} <span className="text-xs font-mono text-emerald-400 font-bold">FCFA</span>
              </div>
              <div className="text-xs text-stone-400 mt-2.5 flex items-center justify-between">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +{metrics.monthlyGrowthPercent}%
                </span>
                <span className="text-[11px] text-stone-500 font-mono">Mock baseline</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">JOBS</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Car className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{metrics.activeJobsCount}</div>
              <div className="text-xs text-stone-400 mt-2.5 flex items-center justify-between">
                <span className="text-stone-300 font-medium">Currently in service</span>
                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-0.5">
                  See Floor View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Completed Jobs</span>
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{metrics.completedJobsCount}</div>
              <div className="text-xs text-stone-400 mt-2.5 flex items-center justify-between">
                <span className="text-stone-300 font-medium">Successfully delivered</span>
                <span className="text-sky-400 font-bold text-[11px] flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" />
                </span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Deferred Repairs</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-300 tracking-tight">{metrics.pendingDeferredRepairsCount}</div>
              <div className="text-xs text-stone-400 mt-2.5 flex items-center justify-between">
                <span className="text-stone-400">Scheduled for recall</span>
                <span className="text-[11px] font-mono text-amber-400 font-bold">Pending follow-up</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Staff</span>
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{metrics.totalStaffCount}</div>
              <div className="text-xs text-stone-400 mt-2.5 flex items-center justify-between">
                <span className="text-stone-300">{members.filter((m) => m.role==='hod').length} Dept Leads</span>
                <button className="text-sky-400 opacity-50 cursor-not-allowed font-bold text-[11px] flex items-center gap-0.5">
                  View Sidebar <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#34D399]" />
                  Department Breakdown
                </h3>
              </div>

              {departments.length === 0 ? (
                <div className="text-center py-10 text-stone-500 text-sm">
                  <Building2 className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p>No departments configured yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((dept) => {
                    const deptMembers = members.filter((m) => m.department_id === dept.id);
                    const hod = deptMembers.find((m) => m.role === 'hod');
                    return (
                      <div key={dept.id} className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-sm text-stone-200">{dept.name}</div>
                          <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
                            <span>{deptMembers.length} technicians assigned</span>
                            {hod && (
                              <span className="text-amber-300 flex items-center gap-1 font-semibold">
                                <Crown className="w-3 h-3 text-amber-400" />
                                Lead: {hod.full_name || 'Unnamed Staff'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-mono px-2.5 py-1 bg-stone-800 text-stone-300 rounded-lg">
                          {deptMembers.length > 0 ? `${deptMembers.length} Active` : 'Vacant'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Workshop Oversight & Security
                </h3>
                <p className="text-xs text-stone-400 mb-4">
                  Multi-tier delegation with autonomous floor operations and subscription compliance.
                </p>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs py-2 border-b border-stone-800">
                    <span className="text-stone-400">Subscription Status</span>
                    <span className="font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      {garage.subscription_status || 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-2 border-b border-stone-800">
                    <span className="text-stone-400">Workshop Owner ID</span>
                    <span className="font-mono text-stone-300 text-[11px] truncate max-w-[180px]">
                      {garage.owner_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-2 border-b border-stone-800">
                    <span className="text-stone-400">Unallocated Technicians</span>
                    <span className="font-bold text-amber-400">
                      {members.filter((m) => !m.department_id).length} workers
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-800 flex justify-between items-center">
                <span className="text-[11px] text-stone-500 font-mono">Garage ID: {garage.id.slice(0, 8)}...</span>
                <span className="text-xs font-bold text-[#34D399] flex items-center gap-1.5">
                  Floor Operations Ready <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* === MERGED ROSTER SECTION === */}
          <div className="mt-8 pt-6 border-t border-stone-800 border-dashed">
            <div className="flex flex-col gap-1 mb-6 text-center sm:text-left">
              <h2 className="text-xl font-black flex items-center justify-center sm:justify-start gap-2 text-white">
                <Users className="w-5 h-5 text-[#c084fc]" />
                Staff Fleet Roster
              </h2>
              <p className="text-xs text-stone-400 font-medium">
                Manage your technical crew and operating personnel seamlessly.
              </p>
            </div>
            <RosterScreen
              members={members}
              departments={departments}
              userRole="owner"
              copiedLink={copiedLink}
              onCopyInviteLink={handleCopyInviteLink}
              onAssignDepartment={handleAssignDepartment}
              onToggleHod={handleToggleHod}
            />
          </div>

        </div>
      )}

      {activeScreen === 'structure' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 h-fit">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#34D399]" />
                Create New Department
              </h3>
              <p className="text-xs text-stone-400 mb-5">
                Establish operational divisions (e.g., Diagnostics, Engine & Transmission).
              </p>

              {deptError && (
                <div className="bg-rose-900/40 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deptError}</span>
                </div>
              )}

              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5 uppercase font-mono">Department Name *</label>
                  <input
                    type="text" required value={deptName} onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g., Engine Diagnostics"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5 uppercase font-mono">Description (Optional)</label>
                  <textarea
                    rows={3} value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Responsibilities, required equipment, or scope..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-stone-600 resize-none"
                  />
                </div>
                <button type="submit" disabled={isSubmittingDept || !deptName.trim()}
                  className="w-full py-2.5 bg-[#34D399] hover:bg-emerald-400 disabled:opacity-50 text-stone-950 font-black rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950">
                  {isSubmittingDept ? 'Creating...' : '+ Save Department'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Configured Departments ({departments.length})
                </h3>
              </div>
              {loading ? (
                <div className="text-center py-12 text-stone-500 text-xs font-mono">Loading departments...</div>
              ) : departments.length === 0 ? (
                <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-2xl p-8 text-center text-stone-500 space-y-2">
                  <Building2 className="w-10 h-10 mx-auto opacity-40 mb-2" />
                  <p className="font-bold text-stone-300">No departments configured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const deptMembers = members.filter((m) => m.department_id === dept.id);
                    const hod = deptMembers.find((m) => m.role === 'hod');
                    return (
                      <div key={dept.id} className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition shadow-lg">
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-black text-base text-white">{dept.name}</h4>
                            <button onClick={() => handleDeleteDepartment(dept.id)} className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition" title="Delete Department"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          {dept.description && <p className="text-xs text-stone-400 line-clamp-2 mb-3">{dept.description}</p>}
                          <div className="bg-stone-950/50 rounded-xl p-3 border border-stone-800/80 space-y-1.5 text-xs">
                            <div className="flex justify-between text-stone-300"><span className="text-stone-500">Staff Count:</span><span className="font-semibold text-stone-200">{deptMembers.length} technicians</span></div>
                            <div className="flex justify-between text-stone-300">
                              <span className="text-stone-500">Head of Dept:</span>
                              <span className="font-semibold text-amber-300 flex items-center gap-1">
                                {hod ? <><Crown className="w-3 h-3 text-amber-400" />{hod.full_name || 'Unnamed Staff'}</> : <span className="text-stone-500 italic">None Assigned</span>}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
