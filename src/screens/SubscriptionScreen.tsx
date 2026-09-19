import React from 'react';
import { Lock, CreditCard } from 'lucide-react';

export const SubscriptionScreen: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  return (
    <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-md bg-stone-900 border border-amber-500/40 p-8 rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black uppercase text-amber-400 mb-2">
          Your 4-Week Free Trial has expired.
        </h1>
        <p className="text-stone-300 text-sm mb-6">
          Upgrade your workspace to unlock the full potential of MOTOLOGA garage management.
        </p>
        <div className="space-y-3">
          <button className="w-full py-4 bg-[#34D399] hover:bg-emerald-400 text-stone-950 font-black rounded-xl transition flex justify-center items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscribe to Motologa
          </button>
          <button onClick={onSignOut} className="w-full py-3 text-stone-400 hover:text-stone-200 font-semibold underline underline-offset-4">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
