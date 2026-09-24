import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Activity, CheckCircle, RefreshCw, Calendar, TrendingUp, Phone, Mail } from 'lucide-react';

interface WorkerProfileScreenProps {
  currentUserId: string;
}

export const WorkerProfileScreen: React.FC<WorkerProfileScreenProps> = ({ currentUserId }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; role: string; phone?: string; email?: string } | null>(null);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
interface WorkerProfileResponse {
  role: 'owner' | 'hod' | 'worker' | null;
  profiles: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
}

      // Fetch member profile natively
      const { data, error: memberErr } = await supabase
        .from('garage_members')
        .select('role, profiles(full_name, email)')
        .eq('user_id', currentUserId)
        .single();
        
      const memberData = data as unknown as WorkerProfileResponse | null;
        
      if (memberErr) {
        console.error('Failed to fetch worker profile data', memberErr);
      } else if (memberData) {
        const profilePayload = Array.isArray(memberData.profiles) ? memberData.profiles[0] : memberData.profiles;
        
        setProfile({
          role: memberData.role || 'worker',
          full_name: profilePayload?.full_name ?? 'Unnamed Staff',
          phone: '',
          email: profilePayload?.email ?? ''
        });
      }

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch completed jobs in the last 30 days
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, created_at, status')
        .eq('assigned_to', currentUserId)
        .in('status', ['ready', 'completed'])
        .gte('created_at', oneMonthAgo);

      if (error) throw error;

      if (jobs) {
        setMonthlyCount(jobs.length);
        const weeklyJobs = jobs.filter(j => j.created_at >= oneWeekAgo);
        setWeeklyCount(weeklyJobs.length);
      }
    } catch (err) {
      console.error('Error fetching worker profile stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-400 bg-stone-950/50 min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-4" /> 
        <span className="animate-pulse tracking-widest text-xs uppercase font-black text-sky-400">Loading Profile</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300 max-w-4xl mx-auto w-full pb-24">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-6 border border-sky-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <User className="w-48 h-48 sm:w-64 sm:h-64 scale-150 rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start sm:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-sky-950 border-4 border-sky-400/30 rounded-full flex items-center justify-center shadow-inner">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-sky-300" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 shadow-black/50 drop-shadow-md">
                {profile?.full_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <div className="flex items-center gap-1.5 text-sky-300/80 font-mono text-[10px] sm:text-xs uppercase tracking-wider bg-sky-950/40 px-3 py-1 rounded-full border border-sky-500/20 w-fit">
                  <WrenchIcon />
                  {profile?.role === 'hod' ? 'Head of Department' : 'Floor Technician'}
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sky-300/80 font-mono text-[10px] sm:text-xs uppercase tracking-wider bg-sky-950/40 px-3 py-1 rounded-full border border-sky-500/20 w-fit">
                    <Phone className="w-3.5 h-3.5" />
                    {profile.phone}
                  </div>
                )}
                {profile?.email && (
                  <div className="flex items-center gap-1.5 text-sky-300/80 font-mono text-[10px] sm:text-xs tracking-wider bg-sky-950/40 px-3 py-1 rounded-full border border-sky-500/20 w-fit lowercase">
                    <Mail className="w-3.5 h-3.5" />
                    {profile.email}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => fetchStats(true)} 
            disabled={isRefreshing}
            className="self-center sm:self-start px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 rounded-xl flex items-center gap-2 transition active:scale-95 shadow font-bold text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Weekly Output Card */}
        <div className="bg-stone-900 border border-stone-800 hover:border-emerald-500/40 transition rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition group-hover:bg-emerald-500/10"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-emerald-950/50 rounded-xl border border-emerald-500/20">
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-stone-300 font-bold uppercase tracking-wider text-sm">Weekly Output</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-4 relative z-10">
            <div className="text-6xl font-black text-emerald-400 drop-shadow-lg mb-2">
              {weeklyCount}
            </div>
            <div className="text-stone-500 text-sm font-medium flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Jobs completed (Last 7 Days)
            </div>
          </div>
        </div>

        {/* Monthly Output Card */}
        <div className="bg-stone-900 border border-stone-800 hover:border-indigo-500/40 transition rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition group-hover:bg-indigo-500/10"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-stone-300 font-bold uppercase tracking-wider text-sm">Monthly Output</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-4 relative z-10">
            <div className="text-6xl font-black text-indigo-400 drop-shadow-lg mb-2">
              {monthlyCount}
            </div>
            <div className="text-stone-500 text-sm font-medium flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Jobs completed (Last 30 Days)
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wrench">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
