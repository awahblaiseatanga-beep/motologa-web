import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProfileSetupScreenProps {
  onComplete: () => void;
  isEditing?: boolean;
  initialName?: string;
  onCancel?: () => void;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ 
  onComplete, 
  isEditing = false, 
  initialName = '',
  onCancel
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });
      
      if (updateError) throw updateError;
      
      await supabase.auth.refreshSession();
      
      onComplete();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to sync identity profile. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E2829] 
      ${isEditing ? 'backdrop-blur-md bg-[#0E2829]/90' : ''}`}
    >
      <div className="w-full max-w-md bg-stone-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background Decal */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-950 border border-emerald-500/40 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <User className="w-8 h-8 text-emerald-400" />
          </div>
          
          <h1 className="text-2xl font-black text-white uppercase tracking-wide mb-2">
            {isEditing ? 'Update Identity' : 'Identity Setup Required'}
          </h1>
          
          <p className="text-sm text-stone-400 font-medium mb-8">
            {isEditing 
              ? 'Update your displayed name that appears across the garage dashboards and rosters.' 
              : 'Before accessing the workshop floor, please define your identity so the system can properly bind your profile.'}
          </p>

          {error && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-6 text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-stone-300 uppercase tracking-wider ml-1">
                Your Full Name
              </label>
              <input 
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-stone-950/60 border border-emerald-500/30 rounded-xl px-4 py-3.5 text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition font-medium"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {isLoading ? (
                  <span className="animate-pulse">Syncing ID...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {isEditing ? 'Save Profile' : 'Lock Identity & Continue'}
                  </>
                )}
              </button>
              
              {isEditing && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-3 rounded-xl font-bold transition active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
