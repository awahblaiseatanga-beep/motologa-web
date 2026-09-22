import React, { useState, useEffect } from 'react';
import { Job, DeferredRepair, GarageMember } from '../types';
import { MechanicQueueScreen } from '../components/MechanicQueueScreen';
import { supabase } from '../lib/supabase';
import {
  fetchGarageMembers,
  removeMemberFromDepartment,
  fetchDeferredRepairs,
  updateJobStatus,
  mapDbJobToUiJob
} from '../lib/api';
import {
  Wrench,
  Users,
  Building2,
  UserX,
  CheckCircle2,
  LayoutDashboard,
  UserCircle
} from 'lucide-react';
import { WorkerProfileScreen } from './WorkerProfileScreen';

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
  const [mechanicFilters, setMechanicFilters] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'queue' | 'profile'>('queue');

  // Load Jobs independently
  const loadJobs = async (isSilent: boolean = false) => {
    if (!currentUserId || !garageId) return;
    if (!isSilent) setLoadingJobs(true);
    try {
      // Guard clause
      if (!currentUserId) return;
      
      const allMembers = await fetchGarageMembers(garageId);
      let fetchedJobs: Job[] = [];
      let availableNames: string[] = [];
      
      // Aggressive Fetch Logging & Flat Query
      console.log("Attempting fetch. Role:", userRole, "User ID:", currentUserId);
      
      // Explicit flat query safely navigating the FK link without crashing implicitly
      let query = supabase.from('jobs').select('*, job_media(*), mechanic:garage_members!jobs_assigned_to_fkey(full_name, email)');
      
      if (userRole === 'worker') {
        query = query.eq('assigned_to', currentUserId).in('status', ['pending', 'in_progress', 'paused']);
      } else {
        query = query.eq('garage_id', garageId).neq('status', 'completed');
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("SUPABASE FETCH ERROR:", error.message);
      } else {
        console.log("SUPABASE FETCH SUCCESS. Jobs found:", data?.length, data);
        const mappedData = data ? data.map(d => mapDbJobToUiJob(d)) : [];
        
        if (userRole === 'owner') {
          fetchedJobs = mappedData;
          availableNames = allMembers.map(m => m.full_name || m.email?.split('@')[0] || 'Unknown');
        } else if (userRole === 'hod') {
          const scopedMembers = allMembers.filter(m => m.department_id === departmentId);
          availableNames = scopedMembers.map(m => m.full_name || m.email?.split('@')[0] || 'Unknown');
          
          fetchedJobs = mappedData.filter(j => {
            if (!j.assigned_to) return true;
            const assignedMember = allMembers.find(m => m.user_id === j.assigned_to);
            return assignedMember && assignedMember.department_id === departmentId;
          });
        } else {
          fetchedJobs = mappedData;
          availableNames = []; // Worker has no filter bar
        }
      }
      
      setJobs(fetchedJobs);
      const uniqueNames = Array.from(new Set(availableNames));
      setMechanicFilters(['All', ...uniqueNames]);

      // Fetch deferred repairs associated with these jobs
      const jobIds = fetchedJobs.map(j => j.id);
      if (jobIds.length > 0) {
        const repairs = await fetchDeferredRepairs(jobIds);
        setDeferredRepairs(repairs);
      }
    } catch (error) {
      console.error("Error loading localized jobs:", error);
    } finally {
      if (!isSilent) setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [userRole, garageId, currentUserId]);



  // Mutate Job locally and via API
  const handleUpdateJob = async (updatedJob: Job) => {
    try {
      // Child elements handle their own Mega-Submit mutations to Supabase directly now.
      // Update local array synchronously to avoid UI delay, then manually refetch the whole architecture array bridging the gap of disabled WebSockets.
      setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
      await loadJobs(true);
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

      </div>

      {loadingJobs ? (
        <div className="text-center py-12 text-stone-400">Loading Job Queue...</div>
      ) : activeView === 'queue' ? (
        <MechanicQueueScreen
          jobs={jobs}
          deferredRepairs={deferredRepairs}
          onUpdateJob={handleUpdateJob}
          onNavigateToCheckout={handleNavigateToCheckout}
          userRole={userRole}
          mechanicFilters={mechanicFilters}
          onSyncBay={async () => { await loadJobs(true); }}
        />
      ) : (
        <WorkerProfileScreen currentUserId={currentUserId!} />
      )}

      {/* Dynamic Island Navigation for Workers */}
      {userRole === 'worker' && currentUserId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-950/90 backdrop-blur-md border border-stone-800 rounded-full p-1.5 flex gap-1 shadow-2xl z-50 animate-in slide-in-from-bottom-8 duration-500">
          <button
            onClick={() => setActiveView('queue')}
            className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${
              activeView === 'queue' 
                ? 'bg-sky-600 text-white shadow-md' 
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline uppercase tracking-wider text-xs">Active Bay</span>
          </button>
          
          <button
            onClick={() => setActiveView('profile')}
            className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${
              activeView === 'profile' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <UserCircle className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline uppercase tracking-wider text-xs">My Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};
