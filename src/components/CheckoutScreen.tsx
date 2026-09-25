import React, { useState, useEffect } from 'react';
import { Job, DeferredRepair, DeferredTimeframe, JobStatus } from '../types';
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
  Phone,
  FileEdit,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { InvoiceGenerator } from './InvoiceGenerator';
import { ScheduleAppointmentModal } from './ScheduleAppointmentModal';

interface CheckoutScreenProps {
  jobs: Job[];
  todayRevenue: number;
  garageName: string;
  garageId: string;
  onUpdateJob: (updatedJob: Job) => void;
  onJobReleased: (job: Job, finalFee: number) => void;
  onAddDeferredRepair?: (repair: DeferredRepair, jobId: string) => void;
  selectedJobId?: string | null;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  jobs,
  todayRevenue,
  garageName,
  garageId,
  onUpdateJob,
  onJobReleased,
  onAddDeferredRepair,
  selectedJobId,
}) => {
  // Find ready vehicles first, otherwise active non-released vehicles
  const candidateVehicles = jobs.filter((j) => j.status === 'Ready/Released' && !j.released);
  const activeUnreleased = candidateVehicles;

  // Selected vehicle for checkout
  const [currentJobId, setCurrentJobId] = useState<string>(() => {
    if (selectedJobId && jobs.some((j) => j.id === selectedJobId)) {
      return selectedJobId;
    }
    if (candidateVehicles.length > 0) return candidateVehicles[0].id;
    return jobs[0]?.id || '';
  });

  const currentJob = jobs.find((j) => j.id === currentJobId) || jobs[0];

  // Billing state
  const [laborFee, setLaborFee] = useState<number | ''>(currentJob?.laborFeeFcfa || '');

  // Dynamic Time & Rates
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [partsCost, setPartsCost] = useState<number | ''>(currentJob?.partsFeeFcfa || '');

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e)) return 0;
    const diffHours = (e - s) / 1000 / 3600;
    return Math.max(0, Number(diffHours.toFixed(1)));
  };

  const hoursWorked = currentJob ? calculateHours(currentJob.startedAt, currentJob.completedAt) : 0;

  useEffect(() => {
    if (hourlyRate !== '') {
      setLaborFee(Math.max(0, hoursWorked * Number(hourlyRate)));
    }
  }, [hourlyRate, hoursWorked, currentJobId]);

  // HOD Summary state
  const [hodJobSummary, setHodJobSummary] = useState<string>(
    currentJob?.hodJobSummary || currentJob?.issueDescription || ''
  );

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
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  
  // Dynamic Configuration State
  const [currencySymbol, setCurrencySymbol] = useState<string>('FCFA');

  useEffect(() => {
    supabase.from('shop_settings').select('currency_symbol').eq('id', 1).single().then(({ data }) => {
      if (data?.currency_symbol) setCurrencySymbol(data.currency_symbol);
    });
  }, []);

  useEffect(() => {
    if (currentJob) {
      setLaborFee(currentJob.laborFeeFcfa || '');
      setPartsCost(currentJob.partsFeeFcfa || '');
      setHodJobSummary(currentJob.hodJobSummary || currentJob.issueDescription || '');
      setFlagDeferred(currentJob.deferredRepair?.flagged || false);
      setDeferredComponent(currentJob.deferredRepair?.component || DEFERRED_COMPONENTS[0]);
      setDeferredTimeframe((currentJob.deferredRepair?.timeframe as DeferredTimeframe) || 'Next Month');
    }
  }, [currentJobId]); // Only hydrate on tab switch to avoid typing disruption

  // Modal receipt state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [copiedInvoice, setCopiedInvoice] = useState<boolean>(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState<boolean>(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState<boolean>(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Synchronize when switching vehicle
  const handleSelectJob = (job: Job) => {
    setCurrentJobId(job.id);
  };

  // Quick preset fee chips
  const PRESET_FEES = [5000, 15000, 25000, 45000];

  // Calculate KPIs
  const vehiclesReadyCount = jobs.filter((j) => j.status === 'Ready/Released' && !j.released).length;
  const needsAttentionCount = jobs.filter(
    (j) => (j.status === 'Diagnosis' || j.status === 'Awaiting Approval') && !j.released
  ).length;

  // Short WhatsApp Text Message for PDF attachment
  const generateWhatsAppInvoiceText = (job: Job) => {
    return `Hello ${job.customerName !== 'Walk-in Client' ? job.customerName : ''},\n\nYour vehicle (${job.licensePlate}) is ready for checkout. Please find your official ${garageName} invoice attached.\n\nThank you for your business!`;
  };

  const [completedJobIds, setCompletedJobIds] = useState<Set<string>>(new Set());

  const handleSaveInvoiceData = async () => {
    if (!currentJob) return;

    const feeAmount = typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0);
    const partsAmt = typeof partsCost === 'number' ? partsCost : (currentJob.partsFeeFcfa || 0);

    const updatedJob: Job = {
      ...currentJob,
      laborFeeFcfa: feeAmount,
      partsFeeFcfa: partsAmt,
      deferredRepair: {
        flagged: flagDeferred,
        component: deferredComponent,
        timeframe: deferredTimeframe,
      },
      status: 'Work Done' as JobStatus,
      released: true,
    };

    const { error } = await supabase
      .from('jobs')
      .update({ 
        status: 'RELEASED', 
        labor_fee: feeAmount,
        parts_fee: partsAmt,
        hod_job_summary: hodJobSummary
      })
      .eq('id', currentJob.id);

    if (error) {
      console.error("Failed to close job in DB:", error);
      throw error; 
    }

    setCompletedJobIds(prev => new Set(prev).add(currentJob.id));

    if (flagDeferred) {
      const newFollowUp: DeferredRepair = {
        id: '',
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
  };

  const handleWhatsAppDispatch = () => {
    if (!currentJob) return;
    
    // We recreate the updatedJob context locally since the state hasn't instantly updated
    const feeAmount = typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0);
    const partsAmt = typeof partsCost === 'number' ? partsCost : (currentJob.partsFeeFcfa || 0);
    const updatedJob: Job = { ...currentJob, laborFeeFcfa: feeAmount, partsFeeFcfa: partsAmt };
    
    const baseText = generateWhatsAppInvoiceText(updatedJob);
    const messageText = `${baseText}\n\nView and download your official document here: ${window.location.origin}/shared/document/${updatedJob.id}`;
    let cleanPhone = currentJob.customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('237')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    
    const waUrl = `https://wa.me/237${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.log('Unable to auto-open window', e);
    }
    
    // Explicit UI Cleanup Request Addressed
    setShowInvoiceGenerator(false);
    onJobReleased(updatedJob, feeAmount);
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
              {currencySymbol} Today
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
          <span>Active Exit</span>
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
                Serviced by <strong className="text-slate-800">{currentJob.mechanic?.full_name || currentJob.assigned_to}</strong>
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

          {/* OWNER EXECUTIVE CHECKOUT: Proof of Work & Summary Override */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-4 shadow-sm mt-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Executive Verification
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                HOD Cleared
              </span>
            </div>

            {/* Proof of Work Photos */}
            {(currentJob.oldPartPhotoUrl || currentJob.newPartPhotoUrl || currentJob.generalJobPhotoUrl) && (
              <div className="space-y-2 pb-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Visual Proof of Work</span>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {currentJob.oldPartPhotoUrl && (
                    <div className="shrink-0 space-y-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <img src={currentJob.oldPartPhotoUrl} alt="Old Part" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                      <span className="text-[9px] font-bold text-slate-500 block text-center uppercase tracking-wider">Old Part</span>
                    </div>
                  )}
                  {currentJob.newPartPhotoUrl && (
                    <div className="shrink-0 space-y-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <img src={currentJob.newPartPhotoUrl} alt="New Part" className="w-24 h-24 object-cover rounded-lg border-2 border-emerald-400/50" />
                      <span className="text-[9px] font-bold text-emerald-600 block text-center uppercase tracking-wider">New Installed</span>
                    </div>
                  )}
                  {currentJob.generalJobPhotoUrl && (
                    <div className="shrink-0 space-y-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <img src={currentJob.generalJobPhotoUrl} alt="General Work" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                      <span className="text-[9px] font-bold text-slate-500 block text-center uppercase tracking-wider">General</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HOD Summary Override */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Final Invoice Summary (Edit before printing)
              </label>
              <textarea
                value={hodJobSummary}
                onChange={(e) => setHodJobSummary(e.target.value)}
                placeholder="Adjust HOD's technical summary for the customer invoice here..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[90px] shadow-inner"
              />
            </div>
          </div>

          <div className="relative space-y-2">
            {(currentJob.status === 'Diagnosis' || currentJob.status === 'In Repair') && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl border border-slate-200 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
                <span className="bg-slate-800 text-white font-black text-sm px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Incomplete - Waiting on Technician
                </span>
              </div>
            )}

            {/* Removed QC Block / HOD Summary UI - Successfully migrated to separate HOD review modal */}

            {/* Automated Checkout Engine */}
            <div className="bg-stone-50 border border-slate-200 rounded-xl p-3.5 space-y-4 shadow-sm mt-3">
               <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded border border-emerald-100">
                 <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Total Time Worked</span>
                 <span className="font-mono font-bold text-emerald-700">{hoursWorked > 0 ? hoursWorked : "None or 0.0"} Hours</span>
               </div>
               
               <div className="flex items-center gap-3">
                 <div className="flex-1 space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex flex-col">
                     Hourly Rate ({currencySymbol})
                   </label>
                   <input type="number" placeholder="e.g. 5000" value={hourlyRate} onChange={e => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold font-mono focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                 </div>
                 {currentJob.partSource === 'Garage Inventory' ? (
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Parts Cost</label>
                     <input type="number" placeholder="e.g. 15000" value={partsCost} onChange={e => setPartsCost(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold font-mono focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                   </div>
                 ) : (
                   <div className="flex-1 space-y-1 hidden sm:block"></div>
                 )}
               </div>
            </div>

            {/* Conditionally display separate part prices before total */}
            {currentJob.partSource !== 'Garage Inventory' && currentJob.partsFeeFcfa ? (
              <div className="flex items-center justify-between pb-2 pt-1 border-b border-dashed border-slate-200 mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Premium Parts Cost ({currencySymbol})
                </label>
                <div className="bg-stone-50 rounded px-2.5 py-1 border border-slate-200">
                   <span className="font-extrabold font-mono text-sm text-slate-800">
                     {currentJob.partsFeeFcfa.toLocaleString()}
                   </span>
                </div>
              </div>
            ) : null}

            {/* MASSIVE INPUT: Total Labor Fee (FCFA) with quick-tap preset chips */}
            <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-500" />
                Total Labor Fee ({currencySymbol})
                {saveStatus['laborFee'] && (
                  <span className="text-[10px] text-emerald-600 ml-2 animate-in fade-in duration-300">
                    {saveStatus['laborFee']}
                  </span>
                )}
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
                  {currencySymbol}
                </span>
              </div>
            </div>

            {/* Quick-tap preset chips (5,000, 15,000, 25,000, 45,000) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {PRESET_FEES.map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => {
                    setLaborFee(fee);
                  }}
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
			  <div className="flex flex-col gap-3">
				{/* The Core Deferment Toggle */}
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
				
				{/* Native Schedule Appointment Branch */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-sky-950/20 border border-sky-900/30 rounded-2xl mx-auto w-full max-w-md shadow-inner">
				   <div className="text-left flex-1 min-w-0">
					   <h4 className="text-sm font-black tracking-tight text-sky-800 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-sky-500"/> Need a Hard Booking?</h4>
					   <p className="text-[11px] font-medium text-slate-500 leading-snug mt-0.5">Secure a rigid target date into the operational calendar.</p>
				   </div>
				   <button
					 type="button"
					 onClick={() => setScheduleModalOpen(true)}
					 className="w-full sm:w-auto shrink-0 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase text-xs px-4 py-2.5 rounded-lg transition-all active:scale-95"
				   >
					  Schedule Now
				   </button>
				</div>
			  </div>
          </div>

          {/* CTA: Open Invoice Generator */}
          <div className="pt-4 mb-2">
            <button
              id="generate-invoice-btn"
              type="button"
              onClick={() => setShowInvoiceGenerator(true)}
              className="w-full min-h-[56px] rounded-xl bg-[#142F30] hover:bg-[#1f4244] active:scale-[0.99] text-amber-400 font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-3 shadow-lg border-2 border-[#142F30] cursor-pointer transition-all px-2"
            >
              <FileEdit className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] shrink-0" />
              <span>Save Pricing & Generate Invoice</span>
            </button>
          </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-lg">All Vehicles Dispatched</h3>
          <p className="text-sm text-slate-500">
            Register new vehicles from the first tab to begin repairs.
          </p>
        </div>
      )}

      {showInvoiceGenerator && currentJob && (
        <InvoiceGenerator 
          garageName={garageName}
          onConfirmSave={handleSaveInvoiceData}
          onConfirmPrint={handleWhatsAppDispatch}
          job={{
            ...currentJob,
            laborFeeFcfa: typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0),
            partsFeeFcfa: typeof partsCost === 'number' ? partsCost : (currentJob.partsFeeFcfa || 0),
            hodJobSummary: hodJobSummary,
            hod_job_summary: hodJobSummary
          } as any}
          onClose={() => {
            setShowInvoiceGenerator(false);
            if (completedJobIds.has(currentJob.id)) {
              onJobReleased(currentJob, typeof laborFee === 'number' ? laborFee : (currentJob.laborFeeFcfa || 0));
            }
          }} 
          currencySymbol={currencySymbol} 
        />
      )}

      {/* Embedded Native Schedule Boundary */}
      {currentJob && (
         <ScheduleAppointmentModal
            isOpen={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            mode="checkout"
            garageId={garageId}
            departmentId={undefined} // Force explicit undefined omitting department strict-cast in DB
            customerName={currentJob.customerName || currentJob.customerPhone}
            vehicleLabel={`${currentJob.licensePlate} - ${currentJob.vehicleModel}`}
            initialDescription={hodJobSummary || currentJob.issueDescription}
            onSchedulingSuccess={() => {
               setScheduleModalOpen(false);
               alert("Appointment Secured & Calendared Locally.");
            }}
         />
      )}
    </div>
  );
};
