import React, { useState } from 'react';
import { Job, DeferredRepair, DeferredTimeframe } from '../types';
import { LicensePlateBadge } from './LicensePlateBadge';
import { StatusChip } from './StatusChip';
import { MotologaLogo } from './MotologaLogo';
import { DEFERRED_COMPONENTS } from '../types';
import { DeferredRepairToggle, DeferredRepairSelection } from './DeferredRepairToggle';
import {
  Banknote,
  Car,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Wrench,
  Sparkles,
  Printer,
  Copy,
  ExternalLink,
  ChevronDown,
  Phone
} from 'lucide-react';

interface CheckoutScreenProps {
  jobs: Job[];
  todayRevenue: number;
  onUpdateJob: (updatedJob: Job) => void;
  onJobReleased: (job: Job, finalFee: number) => void;
  onAddDeferredRepair?: (repair: DeferredRepair, jobId: string) => void;
  selectedJobId?: string | null;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  jobs,
  todayRevenue,
  onUpdateJob,
  onJobReleased,
  onAddDeferredRepair,
  selectedJobId,
}) => {
  // Find ready vehicles first, otherwise active non-released vehicles
  const readyVehicles = jobs.filter((j) => j.status === 'Ready/Released' && !j.released);
  const activeUnreleased = jobs.filter((j) => !j.released);
  const candidateVehicles = readyVehicles.length > 0 ? readyVehicles : activeUnreleased;

  // Selected vehicle for checkout
  const [currentJobId, setCurrentJobId] = useState<string>(() => {
    if (selectedJobId && jobs.some((j) => j.id === selectedJobId)) {
      return selectedJobId;
    }
    if (readyVehicles.length > 0) return readyVehicles[0].id;
    if (activeUnreleased.length > 0) return activeUnreleased[0].id;
    return jobs[0]?.id || '';
  });

  const currentJob = jobs.find((j) => j.id === currentJobId) || jobs[0];

  // Billing state
  const [laborFee, setLaborFee] = useState<number | ''>('');

  // Deferred repair state
  const [flagDeferred, setFlagDeferred] = useState<boolean>(
    currentJob?.deferredRepair?.flagged || false
  );
  const [deferredComponent, setDeferredComponent] = useState<string>(
    currentJob?.deferredRepair?.component || DEFERRED_COMPONENTS[0]
  );
  const [deferredTimeframe, setDeferredTimeframe] = useState<DeferredTimeframe>(
    (currentJob?.deferredRepair?.timeframe as DeferredTimeframe) || 'Next Month'
  );

  // Modal receipt state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [copiedInvoice, setCopiedInvoice] = useState<boolean>(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState<boolean>(false);

  // Synchronize when switching vehicle
  const handleSelectJob = (job: Job) => {
    setCurrentJobId(job.id);
    setLaborFee('');
    setFlagDeferred(job.deferredRepair?.flagged || false);
    if (job.deferredRepair?.component) {
      setDeferredComponent(job.deferredRepair.component);
    }
    if (job.deferredRepair?.timeframe) {
      setDeferredTimeframe(job.deferredRepair.timeframe as DeferredTimeframe);
    }
  };

  // Quick preset fee chips
  const PRESET_FEES = [5000, 15000, 25000, 45000];

  // Calculate KPIs
  const vehiclesReadyCount = jobs.filter((j) => j.status === 'Ready/Released' && !j.released).length;
  const needsAttentionCount = jobs.filter(
    (j) => (j.status === 'Diagnosis' || j.status === 'Awaiting Approval') && !j.released
  ).length;

  // WhatsApp Message Generator
  const generateWhatsAppInvoiceText = (job: Job, fee: number) => {
    const formattedFee = fee.toLocaleString() + ' FCFA';
    let text = `*MOTOLOGA WORKSHOP — FACTURE & REÇU DE SORTIE*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🇨🇲 *Véhicule :* ${job.licensePlate} (${job.vehicleModel})\n`;
    text += `👨🏾‍🔧 *Mécanicien :* ${job.assigned_to_profile?.full_name || job.assigned_to}\n`;
    text += `⚙️ *Type Pièce :* ${job.partSource}\n`;
    text += `💰 *Main d'œuvre (Labor Fee) :* ${formattedFee}\n`;
    text += `📋 *Statut :* Service Terminé & Inspecté ✅\n`;

    if (flagDeferred) {
      text += `\n⚠️ *RAPPEL ENTRETIEN PRÉVENTIF RECOMMANDÉ :*\n`;
      text += `• Composant : *${deferredComponent}*\n`;
      text += `• Échéance conseillée : *${deferredTimeframe}*\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📍 *Garage MOTOLOGA* — Douala / Yaoundé\n`;
    text += `Paiement accepté : Cash, Orange Money, MTN MoMo.\n`;
    text += `Merci pour votre confiance et bonne route !`;

    return text;
  };

  const handleSendWhatsAppCheckout = () => {
    if (!currentJob) return;

    const feeAmount = typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0);

    const updatedJob: Job = {
      ...currentJob,
      laborFeeFcfa: feeAmount,
      deferredRepair: {
        flagged: flagDeferred,
        component: deferredComponent,
        timeframe: deferredTimeframe,
      },
    };

    onUpdateJob(updatedJob);

    // If deferred repair is flagged, record it into MOTOLOGA's follow-up system
    if (flagDeferred) {
      const newFollowUp: DeferredRepair = {
        id: '', // Handled by Supabase DB
        status: 'pending' as const,
        vehiclePlate: currentJob.licensePlate,
        customerPhone: currentJob.customerPhone,
        componentToFix: deferredComponent,
        targetDateString: deferredTimeframe,
      };
      if (onAddDeferredRepair) {
        onAddDeferredRepair(newFollowUp, updatedJob.id);
      }
    }

    const messageText = generateWhatsAppInvoiceText(updatedJob, feeAmount);
    
    let cleanPhone = currentJob.customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('237')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    
    const waUrl = `https://wa.me/237${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    // Open WhatsApp link
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.log('Unable to auto-open window', e);
    }

    // Also trigger on-screen receipt and release
    setShowReceiptModal(true);
    onJobReleased(updatedJob, feeAmount);
  };

  const handleCopyReceipt = () => {
    if (!currentJob) return;
    const feeAmount = typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0);
    const text = generateWhatsAppInvoiceText(currentJob, feeAmount);
    navigator.clipboard.writeText(text);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2500);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* TOP ROW: Three mini KPI cards for Today's Revenue (Golden Amber), Vehicles Ready (Bright Aqua), Needs Attention (Coral Rose) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {/* KPI 1: Today's Revenue (Golden Amber text-amber-500) */}
        <div
          id="kpi-today-revenue"
          className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 truncate">
              Revenue
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
              <Banknote className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-sm xs:text-base sm:text-2xl font-black font-mono tracking-tight text-amber-500 block truncate">
              {todayRevenue.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase truncate">
              FCFA Today
            </span>
          </div>
        </div>

        {/* KPI 2: Vehicles Ready (Bright Aqua / Teal text-teal-500) */}
        <div
          id="kpi-vehicles-ready"
          className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 truncate">
              Ready
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500 shrink-0">
              <Car className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-sm xs:text-base sm:text-2xl font-black font-mono tracking-tight text-teal-500 block">
              {vehiclesReadyCount}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase truncate">
              Collection
            </span>
          </div>
        </div>

        {/* KPI 3: Needs Attention (Coral Rose text-rose-500) */}
        <div
          id="kpi-needs-attention"
          className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 truncate">
              Attention
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-1.5">
            <span className="text-sm xs:text-base sm:text-2xl font-black font-mono tracking-tight text-rose-500 block">
              {needsAttentionCount}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase truncate">
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* Select Vehicle to Checkout carousel if multiple */}
      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
          <span>Active Checkout Bay</span>
          <span className="text-[11px] text-slate-400 font-normal">
            Tap a vehicle plate to inspect bill
          </span>
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {candidateVehicles.map((j) => {
            const isSelected = j.id === currentJobId;
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => handleSelectJob(j)}
                className={`min-h-[48px] px-3.5 py-2 rounded-xl text-left border-2 flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#142F30] border-[#34D399] shadow-md'
                    : 'bg-white border-slate-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      j.status === 'Ready/Released' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></span>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm tracking-wider ${
                      isSelected ? 'text-slate-100' : 'text-slate-800'
                    }`}
                  >
                    {j.licensePlate}
                  </span>
                </div>
                {j.status === 'Ready/Released' && (
                  <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded">
                    READY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CARD: Final Billing */}
      {currentJob ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5">
          {/* Vehicle summary header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="space-y-1">
              <LicensePlateBadge plate={currentJob.licensePlate} size="lg" />
              <div className="text-xs sm:text-sm font-bold text-slate-700 flex flex-wrap items-center gap-1.5 pt-1">
                <span>{currentJob.vehicleModel}</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-mono font-bold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {currentJob.customerPhone}
                </span>
              </div>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <StatusChip status={currentJob.status} size="md" />
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Serviced by <strong className="text-slate-800">{currentJob.assigned_to_profile?.full_name || currentJob.assigned_to}</strong>
              </span>
            </div>
          </div>

          {/* Parts Source Status reminder */}
          <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Parts Used:</span>
            <span className="font-extrabold text-slate-800 px-2 py-0.5 bg-white rounded border border-slate-200 shadow-2xs">
              {currentJob.partSource}
            </span>
          </div>

          {/* MASSIVE INPUT: Total Labor Fee (FCFA) with quick-tap preset chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-500" />
                Total Labor Fee (Main-d'œuvre FCFA)
              </label>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Quick-Tap Presets
              </span>
            </div>

            {/* Massive Numerical Input */}
            <div className="relative rounded-2xl border-2 border-slate-300 bg-stone-50 overflow-hidden focus-within:border-amber-500 focus-within:bg-white transition-all shadow-inner">
              <div className="flex items-center px-4 py-3 min-h-[64px]">
                <input
                  id="labor-fee-input"
                  type="number"
                  step="1000"
                  placeholder="e.g. 15000"
                  value={laborFee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLaborFee(val === '' ? '' : Math.max(0, Number(val)));
                  }}
                  className="w-full text-3xl sm:text-4xl font-mono font-black text-slate-900 bg-transparent focus:outline-none tracking-tight text-center placeholder:text-slate-300 placeholder:font-normal"
                />
                <span className="font-black font-mono text-xl sm:text-2xl text-slate-400 shrink-0 ml-2">
                  FCFA
                </span>
              </div>
            </div>

            {/* Quick-tap preset chips (5,000, 15,000, 25,000, 45,000) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {PRESET_FEES.map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setLaborFee(fee)}
                  className={`min-h-[48px] px-2 py-2 rounded-xl font-mono font-black text-xs sm:text-sm transition-all border-2 active:scale-95 shadow-xs cursor-pointer ${
                    laborFee === fee
                      ? 'bg-[#142F30] text-amber-300 border-amber-400 ring-2 ring-amber-400/20'
                      : 'bg-white hover:bg-stone-50 text-slate-800 border-slate-300'
                  }`}
                >
                  {fee.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* DEFERRED REPAIR SECTION: Creation Component for Future Repair */}
          <div className="pt-2">
            <DeferredRepairToggle
              initialEnabled={flagDeferred}
              initialComponent={deferredComponent}
              initialTimeframe={deferredTimeframe}
              onChange={(data: DeferredRepairSelection) => {
                setFlagDeferred(data.enabled);
                setDeferredComponent(data.component);
                setDeferredTimeframe(data.timeframe as DeferredTimeframe);
              }}
            />
          </div>

          {/* PROPER TEXT VIEW: WhatsApp Invoice Preview Accordion */}
          <div className="pt-1 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Customer Message Preview
              </span>
              <button
                id="toggle-invoice-preview-btn"
                type="button"
                onClick={() => setShowInvoicePreview(!showInvoicePreview)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg bg-emerald-50 border border-emerald-200"
              >
                <span>{showInvoicePreview ? 'Hide Text View' : 'Inspect WhatsApp Text'}</span>
              </button>
            </div>

            {showInvoicePreview && (
              <div className="bg-[#0E2829] rounded-xl p-3 border border-emerald-500/40 text-slate-100 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                    Exact WhatsApp Text (CMR Standard):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    className="text-[11px] font-mono font-bold bg-[#142F30] hover:bg-emerald-950 text-[#34D399] px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 active:scale-95"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedInvoice ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[11px] sm:text-xs font-mono text-emerald-200 leading-relaxed whitespace-pre-wrap select-all">
                  {generateWhatsAppInvoiceText(
                    currentJob,
                    typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0)
                  )}
                </pre>
              </div>
            )}
          </div>

          {/* PRIMARY CTA: A massive, full-width WhatsApp Green button: "Send WhatsApp Checkout & Release" */}
          <div className="pt-1">
            <button
              id="send-whatsapp-checkout-btn"
              type="button"
              onClick={handleSendWhatsAppCheckout}
              className="w-full min-h-[56px] rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-slate-950 font-black text-sm xs:text-base sm:text-lg tracking-wide flex items-center justify-center gap-2 sm:gap-3 shadow-lg border-2 border-[#1EBE5D] cursor-pointer transition-all px-3 py-3 text-center"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 stroke-[2.5]" />
              <span className="leading-tight">Send WhatsApp Checkout & Release</span>
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
              Direct dispatch to customer WhatsApp (+237) • Instant receipt & cloud queue clearance
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-lg">All Vehicles Dispatched</h3>
          <p className="text-sm text-slate-500">
            Intake new vehicles from the first tab to begin repairs.
          </p>
        </div>
      )}

      {/* Official Receipt & Release Modal */}
      {showReceiptModal && currentJob && (
        <div
          id="receipt-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-500 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#0E2829] p-4 text-white flex items-center justify-between border-b border-emerald-500/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-[#34D399]" />
                <div>
                  <h3 className="font-black text-base uppercase tracking-wider">
                    Vehicle Released
                  </h3>
                  <span className="text-xs text-emerald-300 font-mono">
                    WhatsApp Message Dispatched
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="text-xs font-bold bg-stone-800 hover:bg-stone-700 text-slate-300 px-3 py-1.5 rounded-lg active:scale-95"
              >
                Close
              </button>
            </div>

            {/* Modal Body: Receipt print layout */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1 font-sans text-slate-800 text-sm">
              <div className="text-center pb-2.5 border-b border-dashed border-slate-300 flex flex-col items-center">
                <MotologaLogo variant="full" size="sm" className="mb-1 text-slate-900" accentColor="#059669" />
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500">
                  Official Workshop Receipt • CMR
                </span>
                <div className="my-1.5 flex justify-center">
                  <LicensePlateBadge plate={currentJob.licensePlate} size="md" />
                </div>
                <p className="text-xs font-bold text-slate-600">
                  Customer Phone: {currentJob.customerPhone}
                </p>
                <p className="text-[11px] text-slate-400">
                  {new Date().toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Breakdown */}
              <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between font-medium text-xs text-slate-600">
                  <span>Vehicle Model</span>
                  <span className="font-bold text-slate-900">{currentJob.vehicleModel}</span>
                </div>
                <div className="flex justify-between font-medium text-xs text-slate-600">
                  <span>Assigned Technician</span>
                  <span className="font-bold text-slate-900">{currentJob.assigned_to_profile?.full_name || currentJob.assigned_to}</span>
                </div>
                <div className="flex justify-between font-medium text-xs text-slate-600">
                  <span>Parts Source</span>
                  <span className="font-bold text-slate-900">{currentJob.partSource}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Labor Fee</span>
                  <span className="font-mono text-emerald-700 text-base">
                    {(typeof laborFee === 'number'
                      ? laborFee
                      : (currentJob.laborFeeFcfa || 0)
                    ).toLocaleString()}{' '}
                    FCFA
                  </span>
                </div>
              </div>

              {flagDeferred && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-300 text-xs space-y-0.5">
                  <span className="font-bold text-amber-900 block">
                    ⚠️ Future Maintenance Reminder:
                  </span>
                  <span className="text-amber-800">
                    {deferredComponent} scheduled for {deferredTimeframe}
                  </span>
                </div>
              )}

              {/* Copyable raw invoice message */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sent via WhatsApp:
                </span>
                <pre className="text-[11px] font-mono bg-stone-900 text-emerald-300 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap leading-tight">
                  {generateWhatsAppInvoiceText(
                    currentJob,
                    typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0)
                  )}
                </pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-stone-100 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="flex-1 min-h-[48px] rounded-xl bg-white border border-slate-300 hover:bg-stone-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Copy className="w-4 h-4 text-slate-600" />
                <span>{copiedInvoice ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 min-h-[48px] rounded-xl bg-[#0E2829] text-[#34D399] font-black text-sm flex items-center justify-center gap-2 active:scale-95 shadow-xs"
              >
                <span>Done & Return</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
