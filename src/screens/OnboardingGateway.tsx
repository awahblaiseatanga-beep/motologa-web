import React, { useState } from 'react';
import { Building2, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { MotologaLogo } from '../components/MotologaLogo';
import { CreateWorkshopScreen } from './CreateWorkshopScreen';

export const OnboardingGateway: React.FC<{
  userId: string;
  onSignOut: () => void;
  onGarageCreated: () => void;
}> = ({ userId, onSignOut, onGarageCreated }) => {
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return (
      <CreateWorkshopScreen 
        userId={userId} 
        onComplete={onGarageCreated} 
        onCancel={() => setIsCreating(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900/90 border border-emerald-500/40 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#142F30] border-2 border-emerald-400/40 rounded-2xl flex items-center justify-center">
            <MotologaLogo variant="icon" size="sm" accentColor="#34D399" />
          </div>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-2 text-center">
          Welcome to Motologa
        </h1>
        <p className="text-emerald-300 text-sm font-medium text-center mb-8">
          You are not currently linked to any workshop. How would you like to proceed?
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-[#34D399] rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
            <div className="relative bg-[#34D399] hover:bg-[#10B981] text-stone-950 px-5 py-4 rounded-xl flex items-center justify-between font-black uppercase tracking-wide transition-colors">
              <span className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                Create New Workshop
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-stone-800" />
            <span className="mx-4 text-xs font-bold text-stone-500 uppercase">OR</span>
            <div className="flex-grow border-t border-stone-800" />
          </div>

          <button
            onClick={() => alert("Please request an invite link from your Workshop Owner, such as: ?invite=YOUR_GARAGE_ID")}
            className="w-full bg-[#142F30] hover:bg-[#1a3d3e] border border-emerald-500/30 text-emerald-300 px-5 py-4 rounded-xl flex items-center justify-between font-bold transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <span className="flex items-center gap-3">
              <LinkIcon className="w-5 h-5" />
              Join with Invite Link
            </span>
          </button>
        </div>

        <div className="mt-8 text-center border-t border-stone-800/80 pt-6">
          <button
            onClick={onSignOut}
            className="text-stone-400 hover:text-rose-400 text-sm font-semibold transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
