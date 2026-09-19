import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, ShieldCheck, Wrench, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MotologaLogo } from './MotologaLogo';
import { cn } from '../lib/utils';

interface LoginScreenProps {
  onLoginSuccess: (userRole: 'owner' | 'mechanic', mechanicId?: string) => void;
  inviteGarageId?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, inviteGarageId }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // 3D Card Hover Physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleOwnerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsLoading(true);

    // If Supabase credentials aren't set in environment, seamlessly log in with demo owner
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess('owner');
      }, 700);
      return;
    }

    try {
      if (authMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        setIsLoading(false);
        if (signUpError) {
          setError(signUpError.message);
        } else if (data.session) {
          onLoginSuccess('owner');
        } else {
          setInfoMessage('Account created! Check your email to confirm, or click Demo below.');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        setIsLoading(false);
        if (signInError) {
          setError(signInError.message);
        } else if (data.session) {
          onLoginSuccess('owner');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Authentication error. Please try again.');
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Password Reset: Please contact your MOTOLOGA workshop administrator or check your registered email.');
  };

  return (
    <div className="min-h-screen w-full bg-[#051112] relative overflow-x-hidden overflow-y-auto flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Background gradient effect - MOTOLOGA Deep Teal Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E2829]/90 via-[#071A1B] to-[#030A0A] pointer-events-none" />

      {/* Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-soft-light pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Top Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] max-w-4xl h-[50vh] rounded-b-[50%] bg-[#10B981]/15 blur-[90px] pointer-events-none" />

      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl h-[45vh] rounded-b-full bg-[#34D399]/10 blur-[70px] pointer-events-none"
        animate={{
          opacity: [0.15, 0.35, 0.15],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatType: 'mirror',
        }}
      />

      {/* Bottom Radial Glow */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80vw] max-w-xl h-[50vh] rounded-t-full bg-[#0E2829]/60 blur-[80px] pointer-events-none"
        animate={{
          opacity: [0.2, 0.45, 0.2],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: 'mirror',
          delay: 1,
        }}
      />

      {/* Ambient Pulsing Glow Spots */}
      <div className="absolute left-10 top-1/4 w-80 h-80 bg-[#34D399]/5 rounded-full blur-[100px] animate-pulse opacity-50 pointer-events-none" />
      <div className="absolute right-10 bottom-1/4 w-80 h-80 bg-[#10B981]/5 rounded-full blur-[100px] animate-pulse delay-1000 opacity-50 pointer-events-none" />

      {/* 3D Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-sm sm:max-w-md relative z-10 my-4"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 8 }}
        >
          <div className="relative group">
            {/* Card Outer Glow on Hover */}
            <motion.div
              className="absolute -inset-[1px] rounded-3xl opacity-0 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"
              animate={{
                boxShadow: [
                  '0 0 14px 2px rgba(52,211,153,0.06)',
                  '0 0 24px 6px rgba(52,211,153,0.12)',
                  '0 0 14px 2px rgba(52,211,153,0.06)',
                ],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatType: 'mirror',
              }}
            />

            {/* Traveling Light Beam Effect */}
            <div className="absolute -inset-[1.5px] rounded-3xl overflow-hidden pointer-events-none">
              {/* Top Light Beam */}
              <motion.div
                className="absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-[#34D399] to-transparent opacity-80"
                initial={{ filter: 'blur(2px)' }}
                animate={{
                  left: ['-50%', '100%'],
                  opacity: [0.3, 0.85, 0.3],
                  filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                }}
                transition={{
                  left: {
                    duration: 2.6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 1,
                  },
                  opacity: {
                    duration: 1.3,
                    repeat: Infinity,
                    repeatType: 'mirror',
                  },
                  filter: {
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'mirror',
                  },
                }}
              />

              {/* Right Light Beam */}
              <motion.div
                className="absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-[#34D399] to-transparent opacity-80"
                initial={{ filter: 'blur(2px)' }}
                animate={{
                  top: ['-50%', '100%'],
                  opacity: [0.3, 0.85, 0.3],
                  filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                }}
                transition={{
                  top: {
                    duration: 2.6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 1,
                    delay: 0.6,
                  },
                  opacity: {
                    duration: 1.3,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: 0.6,
                  },
                  filter: {
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: 0.6,
                  },
                }}
              />

              {/* Bottom Light Beam */}
              <motion.div
                className="absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-[#34D399] to-transparent opacity-80"
                initial={{ filter: 'blur(2px)' }}
                animate={{
                  right: ['-50%', '100%'],
                  opacity: [0.3, 0.85, 0.3],
                  filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                }}
                transition={{
                  right: {
                    duration: 2.6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 1,
                    delay: 1.2,
                  },
                  opacity: {
                    duration: 1.3,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: 1.2,
                  },
                  filter: {
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: 1.2,
                  },
                }}
              />

              {/* Left Light Beam */}
              <motion.div
                className="absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-[#34D399] to-transparent opacity-80"
                initial={{ filter: 'blur(2px)' }}
                animate={{
                  bottom: ['-50%', '100%'],
                  opacity: [0.3, 0.85, 0.3],
                  filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                }}
                transition={{
                  bottom: {
                    duration: 2.6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 1,
                    delay: 1.8,
                  },
                  opacity: {
                    duration: 1.3,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: 1.8,
                  },
                  filter: {
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    delay: 1.8,
                  },
                }}
              />

              {/* Corner Glow Accents */}
              <motion.div
                className="absolute top-0 left-0 h-[6px] w-[6px] rounded-full bg-[#34D399] blur-[1.5px]"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror' }}
              />
              <motion.div
                className="absolute top-0 right-0 h-[8px] w-[8px] rounded-full bg-[#34D399] blur-[2px]"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatType: 'mirror', delay: 0.5 }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-[8px] w-[8px] rounded-full bg-[#34D399] blur-[2px]"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: 'mirror', delay: 1 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 h-[6px] w-[6px] rounded-full bg-[#34D399] blur-[1.5px]"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.3, repeat: Infinity, repeatType: 'mirror', delay: 1.5 }}
              />
            </div>

            {/* Glass Card Background */}
            <div className="relative bg-[#0E2829]/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 border border-emerald-500/20 shadow-2xl overflow-hidden text-white">
              {/* Subtle Tech Grid Pattern */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(52,211,153,0.8) 0.5px, transparent 0.5px), linear-gradient(45deg, rgba(52,211,153,0.8) 0.5px, transparent 0.5px)`,
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Role Quick-Switch Header */}
              <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-emerald-500/15">
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="font-bold tracking-wider uppercase">CMR Workshop OS</span>
                </div>
              </div>

              {/* Logo and Header */}
              <div className="text-center space-y-2 mb-5">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="mx-auto w-14 h-14 rounded-2xl bg-[#142F30] border-2 border-emerald-400/40 flex items-center justify-center relative overflow-hidden shadow-lg shadow-emerald-950/50"
                >
                  <MotologaLogo variant="icon" size="sm" accentColor="#34D399" />
                  {/* Subtle inner reflection */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-2xl font-black tracking-wider uppercase font-mono text-white"
                >
                  {inviteGarageId ? "Technician Onboarding" : "Owner & Admin Login"}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-slate-300 text-xs font-medium"
                >
                  {inviteGarageId
                    ? "Create your account to join the workshop floor."
                    : "Secure access to MOTOLOGA Command."}
                </motion.p>
              </div>

              {/* Mode Switcher Tabs (Sign In vs Sign Up) */}
              <div className="relative bg-[#071718] p-1 rounded-xl flex items-center mb-5 border border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError('');
                    setInfoMessage('');
                  }}
                  className={cn(
                    'relative flex-1 py-2 text-xs font-bold rounded-lg transition-colors duration-200 z-10 cursor-pointer text-center',
                    authMode === 'signin' ? 'text-stone-950 font-black' : 'text-slate-400 hover:text-white'
                  )}
                >
                  {authMode === 'signin' && (
                    <motion.div
                      layoutId="active-auth-tab"
                      className="absolute inset-0 bg-[#34D399] rounded-lg shadow-md -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setError('');
                    setInfoMessage('');
                  }}
                  className={cn(
                    'relative flex-1 py-2 text-xs font-bold rounded-lg transition-colors duration-200 z-10 cursor-pointer text-center',
                    authMode === 'signup' ? 'text-stone-950 font-black' : 'text-slate-400 hover:text-white'
                  )}
                >
                  {authMode === 'signup' && (
                    <motion.div
                      layoutId="active-auth-tab"
                      className="absolute inset-0 bg-[#34D399] rounded-lg shadow-md -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  Sign Up
                </button>
              </div>

              {/* Alerts: Error or Information Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center gap-2 shadow-inner"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="flex-1">{error}</span>
                  </motion.div>
                )}
                {infoMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2 shadow-inner"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="flex-1">{infoMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Authentication Form */}
              <form onSubmit={handleOwnerAuth} className="space-y-4">
                <div className="space-y-3">
                  {/* Email Input */}
                  <motion.div
                    className={cn('relative', focusedInput === 'email' ? 'z-10' : '')}
                    whileFocus={{ scale: 1.015 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-xl border border-emerald-500/25 bg-[#081B1C]/90 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all duration-200">
                      <Mail
                        className={cn(
                          'absolute left-3.5 w-4 h-4 transition-colors duration-200',
                          focusedInput === 'email' ? 'text-[#34D399]' : 'text-slate-400'
                        )}
                      />

                      <input
                        type="email"
                        required
                        placeholder="owner@motologa.cm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-transparent text-white placeholder:text-slate-500 text-sm font-medium h-12 pl-10 pr-3 outline-none"
                      />

                      {focusedInput === 'email' && (
                        <motion.div
                          layoutId="input-highlight"
                          className="absolute inset-0 bg-emerald-500/5 -z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* Password Input */}
                  <motion.div
                    className={cn('relative', focusedInput === 'password' ? 'z-10' : '')}
                    whileFocus={{ scale: 1.015 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-xl border border-emerald-500/25 bg-[#081B1C]/90 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all duration-200">
                      <Lock
                        className={cn(
                          'absolute left-3.5 w-4 h-4 transition-colors duration-200',
                          focusedInput === 'password' ? 'text-[#34D399]' : 'text-slate-400'
                        )}
                      />

                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder={authMode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-transparent text-white placeholder:text-slate-500 text-sm font-medium h-12 pl-10 pr-11 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeClosed className="w-4 h-4" />}
                      </button>

                      {focusedInput === 'password' && (
                        <motion.div
                          layoutId="input-highlight"
                          className="absolute inset-0 bg-emerald-500/5 -z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                        className="appearance-none h-4 w-4 rounded border border-emerald-500/40 bg-[#081B1C] checked:bg-[#34D399] checked:border-[#34D399] focus:outline-none transition-all cursor-pointer"
                      />
                      {rememberMe && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0E2829"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="absolute pointer-events-none"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-slate-300 hover:text-white transition-colors">
                      Remember me
                    </span>
                  </label>

                </div>

                {/* Primary Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group/button mt-4 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-lg opacity-0 group-hover/button:opacity-80 transition-opacity duration-300 pointer-events-none" />

                  <div className="relative overflow-hidden bg-[#34D399] text-stone-950 font-black h-12 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                    {/* Shimmer Light Sweep */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -z-10"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 1.6,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                      style={{
                        opacity: isLoading ? 1 : 0.4,
                      }}
                    />

                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-stone-950 text-sm font-black uppercase tracking-wide"
                        >
                          <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                          <span>Processing...</span>
                        </motion.div>
                      ) : (
                        <motion.span
                          key="button-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-1.5 text-sm font-black uppercase tracking-wider"
                        >
                          <span>{authMode === 'signin' ? 'Sign In to Workshop' : 'Create Workshop Account'}</span>
                          <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>


              </form>

              {/* Bottom Toggle Note */}
              <div className="text-center text-xs text-slate-400 mt-5 pt-3 border-t border-emerald-500/15">
                {authMode === 'signin' ? (
                  <p>
                    Don't have a garage account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer ml-1"
                    >
                      Create one now
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer ml-1"
                    >
                      Sign In here
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
