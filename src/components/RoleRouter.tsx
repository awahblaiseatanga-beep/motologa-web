import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Garage, GarageMember, Department, SubscriptionStatus } from '../types';
import { OwnerDashboard } from '../screens/OwnerDashboard';
import { QueueScreen } from '../screens/QueueScreen';
import { OnboardingGateway } from '../screens/OnboardingGateway';
import { IntakeScreen } from './IntakeScreen';
import { HodDashboard } from '../screens/HodDashboard';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { CustomerOutboxScreen } from '../screens/CustomerOutboxScreen';
import { ShopSettingsScreen } from '../screens/ShopSettingsScreen';
import { OwnerDailyLogsScreen } from '../screens/OwnerDailyLogsScreen';
import { createJob } from '../lib/api';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { MotologaLogo } from './MotologaLogo';
import { InstallAppButton } from './InstallAppButton';
import { AnimatedTabBar, TabItem } from './ui/animated-tab-bar';
import {
  ShieldAlert,
  CreditCard,
  LogOut,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Users,
  Box,
  Settings,
  X,
  PlusCircle,
  Receipt,
  Building2,
  Wrench,
  CheckCircle2,
  Sparkles,
  Menu,
  Send,
  FileAudio,
  User,
  Calendar
} from 'lucide-react';

interface RoleRouterProps {
  userId: string;
  userEmail?: string;
  userName: string;
  onSignOut: () => void;
}

// 1. Subscription Suspended Screen for Workers / HODs
export const SubscriptionSuspended: React.FC<{
  garageName?: string;
  onSignOut: () => void;
}> = ({ garageName = 'Your Workshop', onSignOut }) => {
  return (
    <div className="min-h-[100dvh] bg-[#0E2829] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-md bg-stone-900/90 border border-rose-500/40 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>

        <h1 className="text-2xl font-black uppercase tracking-wider text-rose-300 mb-2">
          Service Suspended
        </h1>
        <p className="text-stone-300 text-sm leading-relaxed mb-6 font-medium">
          Access to <span className="text-white font-bold">{garageName}</span> has been temporarily locked because the garage subscription is past due.
        </p>

        <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs text-stone-400">
            • Floor operations and technician work are paused.
          </p>
          <p className="text-xs text-stone-400">
            • Please notify the Workshop Owner or Administrator to settle the account.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-stone-700"
          >
            <RefreshCw className="w-4 h-4" />
            Check Again
          </button>
          <button
            onClick={onSignOut}
            className="w-full py-3.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Billing Modal for Owners
export const OwnerBillingModal: React.FC<{
  garage: Garage;
  onClose: () => void;
  onStatusUpdated: (status: SubscriptionStatus) => void;
}> = ({ garage, onClose, onStatusUpdated }) => {
  const [updating, setUpdating] = useState(false);

  const handleSimulatePayment = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('garages')
        .update({ subscription_status: 'active' })
        .eq('id', garage.id);

      if (error) throw error;
      onStatusUpdated('active');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-stone-900 border border-amber-500/40 rounded-2xl p-6 text-white shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Garage Subscription & Billing</h2>
              <p className="text-xs text-stone-400">{garage.name}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
            garage.subscription_status === 'active'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {garage.subscription_status || 'active'}
          </span>
        </div>

        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-sm">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Payment Status Alert
          </p>
          <p className="text-xs text-amber-300/80 leading-relaxed">
            {garage.subscription_status === 'past_due'
              ? 'Your workshop account is marked as past due. Technicians and HODs cannot perform job operations until billing is restored.'
              : 'Your workshop billing plan is active and up to date.'}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-stone-800">
            <span className="text-stone-400">Current Plan</span>
            <span className="font-semibold text-stone-200">MOTOLOGA Workshop Pro</span>
          </div>
          <div className="flex justify-between py-2 border-b border-stone-800">
            <span className="text-stone-400">Billing Cycle</span>
            <span className="font-semibold text-stone-200">Monthly Recurring</span>
          </div>
          <div className="flex justify-between py-2 border-b border-stone-800">
            <span className="text-stone-400">Payment Gateway</span>
            <span className="font-semibold text-emerald-400">MTN MoMo / Orange Money / Card</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {garage.subscription_status === 'past_due' ? (
            <button
              onClick={handleSimulatePayment}
              disabled={updating}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {updating ? 'Processing Payment...' : 'Renew Subscription (Reactivate)'}
            </button>
          ) : (
            <button
              onClick={() => {
                supabase.from('garages').update({ subscription_status: 'past_due' }).eq('id', garage.id).then(() => {
                  onStatusUpdated('past_due');
                });
              }}
              className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-xl border border-stone-700"
            >
              Simulate Past Due (Testing)
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl border border-stone-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const RoleRouter: React.FC<RoleRouterProps> = ({
  userId,
  userEmail,
  userName,
  onSignOut,
}) => {
  const [loading, setLoading] = useState(true);
  const [garage, setGarage] = useState<Garage | null>(null);
  const [membership, setMembership] = useState<GarageMember | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [role, setRole] = useState<'owner' | 'hod' | 'worker' | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [workerTab, setWorkerTab] = useState<'queue' | 'intake'>('queue');
  const [activeOwnerHat, setActiveOwnerHat] = useState<'owner' | 'hod'>('owner');
  const [ownerScreen, setOwnerScreen] = useState<string>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const WORKER_TABS = useMemo(() => {
    const tabs: TabItem[] = [
      { id: 'queue', label: 'JOBS', icon: <Wrench className="w-5 h-5" />, color: '#10b981' }
    ];
    return tabs;
  }, []);

  const currentWorkerTabIndex = WORKER_TABS.findIndex((t) => t.id === workerTab);

  const loadRoleData = async () => {
    setLoading(true);
    try {
      // 1. Check if user is an Owner in `garages`
      const { data: ownerGarage, error: ownerErr } = await supabase
        .from('garages')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (ownerGarage) {
        setGarage(ownerGarage);
        setRole('owner');
        
        // Check for Dual-Role HOD privileges smoothly
        const { data: dualRoleMember, error: dualErr } = await supabase
          .from('garage_members')
          .select('*, departments(*)')
          .eq('user_id', userId)
          .maybeSingle();

        console.log('--- DUAL ROLE CHECK ---', { userId, dualRoleMember, dualErr });

        if (dualRoleMember) {
          console.log('Found Dual Role member:', dualRoleMember);
          if (dualRoleMember.department_id && dualRoleMember.role === 'hod') {
            setDepartment(dualRoleMember.departments);
            setMembership(dualRoleMember);
          }
        }

        setLoading(false);
        return;
      }

      // 2. Otherwise, check `garage_members`
      const { data: memberData, error: memberErr } = await supabase
        .from('garage_members')
        .select(`
          *,
          garages (*),
          departments (*)
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberData) {
        setMembership(memberData);
        setGarage(memberData.garages || null);
        setDepartment(memberData.departments || null);
        setRole(memberData.role as 'owner' | 'hod' | 'worker');
        setLoading(false);
        return;
      }

      setRole(null); // No garage, OnboardingGateway will handle
    } catch (e) {
      console.error('RoleRouter load error:', e);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoleData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0E2829] flex flex-col items-center justify-center text-emerald-400 gap-4">
        <Sparkles className="w-10 h-10 animate-pulse text-[#34D399]" />
        <p className="text-sm font-mono tracking-widest text-emerald-300 uppercase">
          Verifying Workshop Roles & Permissions...
        </p>
      </div>
    );
  }

  // ONBOARDING GATEWAY - No Garage Member data
  if (!role || !garage) {
    return <OnboardingGateway userId={userId} onSignOut={onSignOut} onGarageCreated={loadRoleData} />;
  }

  const isPastDue = garage.subscription_status === 'past_due';

  // 1. SUBSCRIPTION LOCKDOWN FOR WORKERS & HODS
  if (isPastDue && role !== 'owner') {
    return (
      <SubscriptionSuspended
        garageName={garage.name}
        onSignOut={onSignOut}
      />
    );
  }

  // Header Bar with Role Badges & Navigation Switcher
  const renderHeader = () => (
    <header className="bg-stone-900/90 border-b border-emerald-950/60 sticky top-0 z-40 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MotologaLogo className="w-7 h-7 text-[#34D399]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-sm tracking-wide">
                {garage.name || 'MOTOLOGA WORKSHOP'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                role === 'owner'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : role === 'hod'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}>
                {role === 'owner' ? 'Owner / Admin' : role === 'hod' ? `HOD • ${department?.name || 'Dept'}` : `Technician`}
              </span>
            </div>
            {department && (
              <p className="text-[11px] text-stone-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-stone-500" />
                Department: <span className="text-stone-300">{department.name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual Role Switcher Toggle */}
          {role === 'owner' ? (
            department && membership && membership.role === 'hod' ? (
              <button
                onClick={() => setActiveOwnerHat(prev => prev === 'owner' ? 'hod' : 'owner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 ${
                  activeOwnerHat === 'owner' 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
                title="Toggle Dashboard View"
              >
                {activeOwnerHat === 'owner' ? (
                  <>👔 Switch to HOD View</>
                ) : (
                  <>👑 Switch to Owner View</>
                )}
              </button>
            ) : (
               <div className="hidden sm:flex text-[10px] text-stone-500 bg-stone-800 px-2 py-1 rounded">
                 (Not HOD assigned in Roster)
               </div>
            )
          ) : null}

          {role === 'owner' && isPastDue && (
            <button
              onClick={() => setShowBillingModal(true)}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Subscription Past Due</span>
            </button>
          )}

          {role === 'owner' && (
            <button
              onClick={() => setShowBillingModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg border border-stone-700"
              title="Billing & Subscription"
            >
              <CreditCard className="w-3.5 h-3.5 text-stone-400" />
              <span>Billing</span>
            </button>
          )}

          <button
            onClick={() => setIsEditingProfile(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg border border-stone-700"
            title="Edit Identity Profile"
          >
            <User className="w-3.5 h-3.5 text-stone-400" />
            <span>Profile</span>
          </button>

          <InstallAppButton variant="header" />

          <button
            onClick={onSignOut}
            className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );

  if (role === 'owner' && activeOwnerHat === 'owner') {
    return (
      <div className="flex h-[100dvh] bg-[#0E2829] text-stone-100 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}

        {/* Sidebar Container */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 border-r border-emerald-950/60 transform transition-transform duration-300 flex flex-col md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MotologaLogo className="w-6 h-6 text-[#34D399]" />
              <span className="font-black text-white text-sm tracking-widest uppercase">Admin</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-stone-400 hover:text-white p-1 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-stone-800">
            <div className="text-xs font-mono text-emerald-500 uppercase tracking-wider mb-1">Workshop</div>
            <div className="font-bold text-stone-200 truncate">{garage.name}</div>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button 
              onClick={() => { setOwnerScreen('analytics'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'analytics' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <BarChart3 className="w-4 h-4" /> Analytics Dashboard
            </button>
            <button 
              onClick={() => { setOwnerScreen('queue'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'queue' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <Building2 className="w-4 h-4" /> JOBS
            </button>
            <button 
              onClick={() => { setOwnerScreen('intake'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'intake' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <PlusCircle className="w-4 h-4" /> Register
            </button>
            <button 
              onClick={() => { setOwnerScreen('checkout'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'checkout' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <Receipt className="w-4 h-4" /> Exit
            </button>
            <button 
              onClick={() => { setOwnerScreen('appointments'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'appointments' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <Calendar className="w-4 h-4" /> Appointments
            </button>
            <button 
              onClick={() => { setOwnerScreen('inventory'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'inventory' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <Box className="w-4 h-4" /> Inventory
            </button>
            <button 
              onClick={() => { setOwnerScreen('outbox'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'outbox' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <Send className="w-4 h-4" /> Customer Outbox
            </button>
            <button 
              onClick={() => { setOwnerScreen('daily_logs'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'daily_logs' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <FileAudio className="w-4 h-4" /> Day Summary
            </button>
            <button 
              onClick={() => { setOwnerScreen('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${ownerScreen === 'settings' ? 'bg-[#34D399]/10 text-[#34D399]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
            >
              <Settings className="w-4 h-4" /> Shop Settings
            </button>
          </nav>

          <div className="p-3 border-t border-stone-800">
            <button onClick={onSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl font-semibold text-sm transition-all">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Interface Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          <header className="bg-stone-900/90 border-b border-stone-800 sticky top-0 z-30 backdrop-blur-md px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 bg-stone-800 rounded-lg text-stone-300">
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-sm font-black text-white">
                {ownerScreen === 'analytics' ? 'Analytics Engine' : 
                 ownerScreen === 'queue' ? 'JOBS' :
                 ownerScreen === 'intake' ? 'Vehicle Register' :
                 ownerScreen === 'checkout' ? 'Exit' :
                 ownerScreen === 'inventory' ? 'Inventory Management' :
                 ownerScreen === 'daily_logs' ? 'End of Day HOD Logs' :
                 'Shop Settings'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Dual Role Switcher Toggle (from Owner view) */}
              {department && membership && membership.role === 'hod' ? (
                <button
                  onClick={() => setActiveOwnerHat('hod')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                  title="Switch to HOD Dashboard"
                >
                  👔 Switch to HOD View
                </button>
              ) : (
                 <div className="hidden sm:flex text-[10px] text-stone-500 bg-stone-800 px-2 py-1 rounded">
                   (Not HOD assigned in Roster)
                 </div>
              )}

              {isPastDue ? (
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="px-3 py-1.5 bg-rose-600/20 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Past Due</span>
                </button>
              ) : (
                <button onClick={() => setShowBillingModal(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-stone-300 text-xs rounded-lg">
                  <CreditCard className="w-3.5 h-3.5" /> Billing
                </button>
              )}
              <button
                onClick={() => setIsEditingProfile(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg border border-stone-700"
                title="Edit Identity Profile"
              >
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Profile</span>
              </button>
              <InstallAppButton variant="header" />
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-6 h-full">
            {(garage.trial_ends_at && new Date() > new Date(garage.trial_ends_at) && garage.subscription_status !== 'active') ? (
              <SubscriptionScreen onSignOut={onSignOut} />
            ) : ownerScreen === 'inventory' ? (
              <InventoryScreen garageId={garage.id} />
            ) : ownerScreen === 'outbox' ? (
              <CustomerOutboxScreen userRole="owner" garageId={garage.id} />
            ) : ownerScreen === 'daily_logs' ? (
              <OwnerDailyLogsScreen garageId={garage.id} garageName={garage.name} />
            ) : ownerScreen === 'settings' ? (
              <ShopSettingsScreen garageId={garage.id} />
            ) : (
              <OwnerDashboard garage={garage} activeScreen={ownerScreen} />
            )}
          </main>
        </div>

        {showBillingModal && (
          <OwnerBillingModal
            garage={garage}
            onClose={() => setShowBillingModal(false)}
            onStatusUpdated={(newStatus) => setGarage(prev => prev ? { ...prev, subscription_status: newStatus } : prev)}
          />
        )}

        {isEditingProfile && (
          <ProfileSetupScreen
            isEditing
            initialName={membership?.full_name || ''}
            onComplete={async () => {
              setIsEditingProfile(false);
              await supabase.auth.getSession(); // Silent refresh for local session state cache
              loadRoleData(); // Refresh the role data to explicitly update UI bindings globally
            }}
            onCancel={() => setIsEditingProfile(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0E2829] text-stone-100 flex flex-col">
      {renderHeader()}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {(role === 'hod' || (role === 'owner' && activeOwnerHat === 'hod')) && (
          <HodDashboard
            userId={userId}
            garageId={garage.id}
            garageName={garage.name}
            departmentId={department?.id}
            departmentName={department?.name}
            membership={membership}
          />
        )}

        {role === 'worker' && (
          <div className="flex flex-col flex-1 gap-4 pb-16">
            <div className="animate-in fade-in duration-200">
              <QueueScreen
                userRole={role}
                departmentId={department?.id}
                departmentName={department?.name}
                garageId={garage.id}
                currentUserId={userId}
              />
            </div>
          </div>
        )}
      </main>

      {isEditingProfile && (
        <ProfileSetupScreen
          isEditing
          initialName={membership?.full_name || ''}
          onComplete={async () => {
            setIsEditingProfile(false);
            await supabase.auth.getSession();
            loadRoleData();
          }}
          onCancel={() => setIsEditingProfile(false)}
        />
      )}
    </div>
  );
};
