import React from 'react';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InstallAppButtonProps {
  variant?: 'header' | 'login' | 'banner';
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ variant = 'header', className }) => {
  const { installPromptEvent, promptInstall } = useInstallPrompt();

  // If there's no prompt event, it means either they already installed it, or browser doesn't support it
  if (!installPromptEvent) return null;

  if (variant === 'login') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("w-full flex justify-center mt-6", className)}
        >
          <button
            onClick={promptInstall}
            className="group relative flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#081B1C]/90 border border-emerald-500/30 text-emerald-300 font-bold shadow-lg overflow-hidden cursor-pointer active:scale-95 transition-all hover:bg-emerald-950/30 hover:border-emerald-500/50 hover:text-emerald-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
            <Download className="w-4 h-4 animate-bounce group-hover:animate-none" />
            <span>Install App on Device</span>
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Header or default variant
  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={promptInstall}
        className={cn(
          "hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-300 font-bold text-xs rounded-lg border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer shadow-inner shadow-emerald-900/50",
          className
        )}
        title="Add to Home Screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install</span>
      </motion.button>
    </AnimatePresence>
  );
};
