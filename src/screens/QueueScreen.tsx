import React, { useState, useEffect } from 'react';
import { Job, DeferredRepair, GarageMember } from '../types';
import { MechanicQueueScreen } from '../components/MechanicQueueScreen';
import {
  fetchGarageMembers,
  removeMemberFromDepartment,
  fetchJobsForMechanic,
  fetchJobsForGarage,
  fetchDeferredRepairs,
  updateJobStatus
} from '../lib/api';
import {
  Wrench,
  Users,
  Building2,
  UserX,
  CheckCircle2,
} from 'lucide-react';

interface QueueScreenProps {
  userRole: 'owner' | 'hod' | 'worker';
  departmentId?: string;
  departmentName?: string;
  garageId: string;
  currentUserId?: string;
}

export const QueueScreen: React.FC<QueueScreenProps> = ({
  userRole,
  departmentId,
  departmentName,
  garageId,
  currentUserId,
}) => {
  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [deferredRepairs, setDeferredRepairs] = useState<DeferredRepair[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // HOD specific state
  const [activeHodTab, setActiveHodTab] = useState<'queue' | 'roster'>('queue');
  const [deptWorkers, setDeptWorkers] = useState<GarageMember[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [removeStatus, setRemoveStatus] = useState<string | null>(null);

  // Load Jobs independently
  const loadJobs = async () => {
    if (!currentUserId || !garageId) return;
    setLoadingJobs(true);
    try {
      // In V5, Workers only see their assigned jobs. HODs could see all in department, but for now they see their own or garage-wide depending on future schema.
      // Since HOD schema does not strictly map jobs to departments yet, we'll fetch assigned jobs for both for safety, OR if Owner, fetch all.
      let fetchedJobs: Job[] = [];
      if (userRole === 'owner') {
        fetchedJobs = await fetchJobsForGarage(garageId);
      } else {
        fetchedJobs = await fetchJobsForMechanic(currentUserId);
      }
      
      setJobs(fetchedJobs);

      // Fetch deferred repairs associated with these jobs
      const jobIds = fetchedJobs.map(j => j.id);
      if (jobIds.length > 0) {
        const repairs = await fetchDeferredRepairs(jobIds);
        setDeferredRepairs(repairs);
      }
    } catch (error) {
      console.error("Error loading localized jobs:", error);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [userRole, garageId, currentUserId]);

  // Load Department Roster for HOD
  const loadDepartmentRoster = async () => {
    if (!garageId || !departmentId) return;
    setLoadingRoster(true);
    try {
      const allMembers = await fetchGarageMembers(garageId);
      const filtered = allMembers.filter((m) => m.department_id === departmentId);
      setDeptWorkers(filtered);
    } catch (err) {
      console.error('Failed to load department roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (userRole === 'hod' && departmentId) {
      loadDepartmentRoster();
    }
  }, [userRole, departmentId, garageId]);

  // HOD action
  const handleRemoveWorkerFromDept = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the ${departmentName || 'department'} roster?`)) {
      return;
    }
    try {
      await removeMemberFromDepartment(memberId);
      setDeptWorkers((prev) => prev.filter((m) => m.id !== memberId));
      setRemoveStatus(`${memberName} removed from department.`);
      setTimeout(() => setRemoveStatus(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member from department');
    }
  };

  // Mutate Job locally and via API
  const handleUpdateJob = async (updatedJob: Job) => {
    try {
      await updateJobStatus(updatedJob.id, updatedJob.status, updatedJob.laborFeeFcfa);
      setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
    } catch (error) {
      alert("Failed to update status. Please try again.");
    }
  };

  const handleNavigateToCheckout = () => {
    if (userRole === 'owner') {
      // Typically Owner uses OwnerDashboard navigation, but for standalone QueueScreen:
      alert("Checkout operations must be handled from the Owner Dashboard Checkout Tab.");
    } else {
      alert("Only Workshop Owners can process final payments and checkout via their Dashboard.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Role-Specific Header / Context Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 border border-stone-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">
              {userRole === 'owner'
                ? 'Garage-Wide Queue'
                : userRole === 'hod'
                ? `HOD Operations • ${departmentName || 'Department'}`
                : `Technician Floor Station`}
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Active Bay & Repair Queue</h2>
        </div>

        {/* HOD View Tabs Switcher */}
        {userRole === 'hod' && (
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveHodTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeHodTab === 'queue'
                  ? 'bg-[#34D399] text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Repair Queue</span>
            </button>
            <button
              onClick={() => setActiveHodTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeHodTab === 'roster'
                  ? 'bg-[#34D399] text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>My Department Roster ({deptWorkers.length})</span>
            </button>
          </div>
        )}
      </div>

      {removeStatus && (
        <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{removeStatus}</span>
        </div>
      )}

      {/* 1. HOD "My Department Roster" Tab */}
      {userRole === 'hod' && activeHodTab === 'roster' ? (
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                {departmentName || 'Department'} Technician Roster
              </h3>
              <p className="text-xs text-stone-400">
                Manage technicians currently assigned to your department.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
              {deptWorkers.length} Active
            </span>
          </div>

          {loadingRoster ? (
            <div className="text-center py-10 text-stone-500 text-xs font-mono">
              Loading department roster...
            </div>
          ) : deptWorkers.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-sm">
              <Users className="w-8 h-8 mx-auto opacity-40 mb-2" />
              <p>No technicians assigned to your department yet.</p>
              <p className="text-xs text-stone-600 mt-1">
                The Workshop Owner can allocate technicians in the Master Roster.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-800/80">
              {deptWorkers.map((member) => {
                const displayName = member.full_name || member.email?.split('@')[0] || 'Technician';

                return (
                  <div
                    key={member.id}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-stone-800/20 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-white text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{displayName}</span>
                          {member.role === 'hod' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              HOD (Lead)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {member.email || `ID: ${member.user_id.slice(0, 8)}...`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveWorkerFromDept(member.id, displayName)}
                      className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                      title="Remove from this department"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. Operational Repair Queue */
        loadingJobs ? (
          <div className="text-center py-12 text-stone-400">Loading Job Queue...</div>
        ) : (
          <MechanicQueueScreen
            jobs={jobs}
            deferredRepairs={deferredRepairs}
            onUpdateJob={handleUpdateJob}
            onNavigateToCheckout={handleNavigateToCheckout}
          />
        )
      )}
    </div>
  );
};
