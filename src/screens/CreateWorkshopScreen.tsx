import React, { useState } from 'react';
import { Building2, MapPin, Phone, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { MotologaLogo } from '../components/MotologaLogo';
import { provisionNewWorkshop } from '../lib/api';

interface CreateWorkshopScreenProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const CreateWorkshopScreen: React.FC<CreateWorkshopScreenProps> = ({ userId, onComplete, onCancel }) => {
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg("Please securely complete all workspace details.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await provisionNewWorkshop(userId, shopName.trim(), phone.trim(), address.trim());
      onComplete(); // Triggers the parent re-authentication loop smoothly bypassing network artifacts
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize the environment setup natively.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center p-4">
      {/* Absolute Ambient UI Overlays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] max-w-4xl h-[50vh] rounded-b-[50%] bg-[#10B981]/10 blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/90 border border-emerald-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-md relative z-10">
        
        {/* Header Block */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 bg-[#142F30] border-2 border-emerald-400/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <MotologaLogo variant="icon" size="sm" accentColor="#34D399" />
          </div>
          <button 
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-600 transition-colors"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
          Provision Workspace
        </h1>
        <p className="text-emerald-300 text-sm font-medium mb-8">
          Register your official garage command center globally capturing offline workflows.
        </p>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center shadow-inner">
            <ShieldCheck className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Workshop & Garage Name</label>
            <div className="relative flex items-center overflow-hidden rounded-xl border border-emerald-500/25 bg-[#081B1C]/90 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all duration-200">
              <Building2 className="absolute left-3.5 w-4 h-4 text-emerald-500" />
              <input
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Prestige Auto Center"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-transparent text-white placeholder:text-stone-500 text-sm font-medium h-12 pl-10 pr-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Official Mobile Phone</label>
            <div className="relative flex items-center overflow-hidden rounded-xl border border-emerald-500/25 bg-[#081B1C]/90 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all duration-200">
              <Phone className="absolute left-3.5 w-4 h-4 text-emerald-500" />
              <div className="absolute left-10 text-stone-400 text-sm font-bold border-r border-stone-600 pr-2 py-1">🇨🇲 +237</div>
              <input
                type="tel"
                required
                maxLength={20}
                placeholder="699 45 12 88"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent text-white placeholder:text-stone-500 text-sm font-medium h-12 pl-[90px] pr-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Physical Location</label>
            <div className="relative flex items-center overflow-hidden rounded-xl border border-emerald-500/25 bg-[#081B1C]/90 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all duration-200">
              <MapPin className="absolute left-3.5 top-4 w-4 h-4 text-emerald-500" />
              <textarea
                required
                maxLength={250}
                placeholder="e.g. Bonamoussadi, Douala"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-transparent text-white placeholder:text-stone-500 text-sm font-medium min-h-[50px] pl-10 pr-3 py-3 outline-none resize-y"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 h-12 relative overflow-hidden bg-[#34D399] disabled:opacity-70 disabled:cursor-not-allowed text-stone-950 font-black rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-emerald-950/40"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                BUILDING ENVIRONMENT...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 tracking-wider">
                PROVISION WORKSPACE
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
