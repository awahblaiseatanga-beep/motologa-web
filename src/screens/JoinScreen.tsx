import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchGarage, fetchDepartments, joinGarageMember } from '../lib/api';
import { Garage, Department } from '../types';
import { MotologaLogo } from '../components/MotologaLogo';
import {
  Wrench,
  Building2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface JoinScreenProps {
  garageId: string;
  onJoinSuccess: () => void;
  onCancel: () => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  garageId,
  onJoinSuccess,
  onCancel,
}) => {
  const [garage, setGarage] = useState<Garage | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGarageInfo = async () => {
      setLoadingInitial(true);
      try {
        const [garageData, deptsData] = await Promise.all([
          fetchGarage(garageId),
          fetchDepartments(garageId),
        ]);
        setGarage(garageData);
        setDepartments(deptsData);
        if (deptsData.length > 0) {
          setSelectedDeptId(deptsData[0].id);
        }
      } catch (err: any) {
        console.error('JoinScreen load error:', err);
        // Fallback for when unauthenticated users hit RLS before signup
        setGarage({ id: garageId, name: 'the Workshop' } as Garage);
      } finally {
        setLoadingInitial(false);
      }
    };

    if (garageId) {
      loadGarageInfo();
    }
  }, [garageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Attempt signup with Supabase Auth
      let authUserId: string | null = null;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (signUpError) {
        // If user already registered, attempt to sign in
        if (signUpError.message.includes('already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) throw signInError;
          authUserId = signInData.user?.id || null;
        } else {
          throw signUpError;
        }
      } else {
        authUserId = signUpData.user?.id || null;
        
        // 1b. Explicit programmatic login post-signup to ensure RLS session exists
        const { error: manualSignInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (manualSignInError) throw manualSignInError;
      }

      if (!authUserId) {
        throw new Error('Could not resolve user account ID.');
      }

      // 1c. CRITICAL FIX: Flush the auth state to ensure PostgREST headers are updated
      await supabase.auth.getSession();

      // 2. Insert record into `garage_members` table
      await joinGarageMember(
        garageId,
        authUserId,
        selectedDeptId,
        'worker'
      );

      // 3. Clean invite param from URL & trigger success
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());

      onJoinSuccess();
    } catch (err: any) {
      console.error('Join submission error:', err);
      setError(err.message || 'Failed to complete staff onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center p-6 text-white text-center">
        <Sparkles className="w-10 h-10 text-[#34D399] animate-pulse mb-4" />
        <p className="text-sm font-mono tracking-widest text-emerald-300 uppercase">
          Loading Workshop Staff Invite...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center p-4 sm:p-6 text-white">
      <div className="w-full max-w-md bg-stone-900/90 border border-emerald-500/30 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        {/* Workshop Brand & Welcome */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-3 text-[#34D399]">
            <MotologaLogo className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
            Join {garage?.name || 'Workshop'}
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-mono">
            Technician & Staff Onboarding Portal
          </p>
        </div>

        {error && (
          <div className="bg-rose-900/40 border border-rose-500/40 text-rose-300 text-xs p-3.5 rounded-xl mb-5 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Full Name / Nickname
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ibrahim Njoya"
                required
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
              <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tech@motologa.local"
                required
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Department Selection Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
              <span>Assigned Department</span>
              <span className="text-[10px] text-emerald-400 font-mono">Floor Section</span>
            </label>
            <div className="relative">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none"
              >
                {departments.length === 0 ? (
                  <option value="">General Floor (No departments created)</option>
                ) : (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))
                )}
              </select>
              <Building2 className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Select the workshop division you will be working under.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#34D399] hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-sm transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Joining Workshop...</span>
            ) : (
              <>
                <span>Complete Staff Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-800 text-center">
          <button
            onClick={onCancel}
            className="text-xs text-stone-400 hover:text-stone-200 transition"
          >
            Return to Regular Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
