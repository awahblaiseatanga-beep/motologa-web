import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Garage, GarageMember, Department, SubscriptionStatus } from '../types';
import { OwnerDashboard } from '../screens/OwnerDashboard';
import { QueueScreen } from '../screens/QueueScreen';
import { OnboardingGateway } from '../screens/OnboardingGateway';
import { MotologaLogo } from './MotologaLogo';
import {
  ShieldAlert,
  CreditCard,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface RoleRouterProps {
  userId: string;
  userEmail?: string;
  onSignOut: () => void;
}

// 1. Subscription Suspended Screen for Workers / HODs
export const SubscriptionSuspended: React.FC<{
  garageName?: string;
  onSignOut: () => void;
}> = ({ garageName = 'Your Workshop', onSignOut }) => {
  return (
    <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center p-6 text-white text-center">
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
  onSignOut,
}) => {
  const [loading, setLoading] = useState(true);
  const [garage, setGarage] = useState<Garage | null>(null);
  const [membership, setMembership] = useState<GarageMember | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [role, setRole] = useState<'owner' | 'hod' | 'worker' | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);

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
      <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center text-emerald-400 gap-4">
        <Sparkles className="w-10 h-10 animate-pulse text-[#34D399]" />
        <p className="text-sm font-mono tracking-widest text-emerald-300 uppercase">
          Verifying Workshop Roles & Permissions...
        </p>
      </div>
    );
  }

  // ONBOARDING GATEWAY - No Garage Member data
  if (!role || !garage) {
    return <OnboardingGateway userId={userId} onSignOut={onSignOut} />;
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

  return (
    <div className="min-h-screen bg-[#0E2829] text-stone-100 flex flex-col">
      {renderHeader()}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {role === 'owner' && (
          <OwnerDashboard
            garage={garage}
          />
        )}

        {(role === 'worker' || role === 'hod') && (
          <QueueScreen
            userRole={role}
            departmentId={department?.id}
            departmentName={department?.name}
            garageId={garage.id}
            currentUserId={userId}
          />
        )}
      </main>

      {showBillingModal && (
        <OwnerBillingModal
          garage={garage}
          onClose={() => setShowBillingModal(false)}
          onStatusUpdated={(newStatus) => {
            setGarage((prev) => prev ? { ...prev, subscription_status: newStatus } : prev);
          }}
        />
      )}
    </div>
  );
};
