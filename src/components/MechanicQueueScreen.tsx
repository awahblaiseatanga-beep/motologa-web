import React, { useState, useEffect } from 'react';
import { Job, PartSource, JobStatus, DeferredRepair, InventoryItem } from '../types';
import { supabase } from '../lib/supabase';
import { LicensePlateBadge } from './LicensePlateBadge';
import { StatusChip } from './StatusChip';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { MotologaLogo } from './MotologaLogo';
import { VoiceRecorderField } from './VoiceRecorderField';
import { DviLoggingWidget } from './DviLoggingWidget';
import { Clock, Camera, CheckCircle2, User, Package, ShieldAlert, Check, Phone, RefreshCw, AlertTriangle } from 'lucide-react';

interface MechanicQueueScreenProps {
  jobs: Job[];
  deferredRepairs?: DeferredRepair[];
  onUpdateRepairs?: (repairs: DeferredRepair[]) => void;
  onUpdateJob: (updatedJob: Job) => void;
  onNavigateToCheckout: (jobId?: string) => void;
  onSyncBay?: () => void | Promise<void>;
  userRole?: 'owner' | 'hod' | 'worker';
  mechanicFilters?: string[];
}

export const MechanicQueueScreen: React.FC<MechanicQueueScreenProps> = ({
  jobs,
  deferredRepairs = [],
  onUpdateRepairs,
  onUpdateJob,
  onNavigateToCheckout,
  onSyncBay,
  userRole = 'worker',
  mechanicFilters = [],
}) => {
  const [filterMechanic, setFilterMechanic] = useState<string>('All');
  const [authorizedFindings, setAuthorizedFindings] = useState<any[]>([]);
  const [activePhotoTarget, setActivePhotoTarget] = useState<{
    jobId: string;
    type: 'old-part' | 'new-part' | 'general-job';
  } | null>(null);
  const [completedToast, setCompletedToast] = useState<{ plate: string; id: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryPart, setSelectedInventoryPart] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [localEdits, setLocalEdits] = useState<Record<string, {
    voiceNoteUrl?: string; 
    diagnosticVoiceNoteUrl?: string;
    voiceNoteDurationSeconds?: number;
    oldPartPhotoUrl?: string; 
    newPartPhotoUrl?: string; generalJobPhotoUrl?: string; partSource?: PartSource; laborFeeFcfa?: number; }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  const [financialConfig, setFinancialConfig] = useState<{ rate: number, symbol: string, markup: number }>({ rate: 0, symbol: 'FCFA', markup: 10 });

  useEffect(() => {
    supabase
      .from('inventory_items')
      .select('id, garage_id, part_name, quantity_in_stock, minimum_stock_level, buying_price, selling_price')
      .gt('quantity_in_stock', 0)
      .then(({ data }) => {
        if (data) setInventoryItems(data);
      });
      
    supabase
      .from('shop_settings')
      .select('standard_labor_rate, currency_symbol, inventory_markup_percentage')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setFinancialConfig({ 
          rate: data.standard_labor_rate || 0, 
          symbol: data.currency_symbol || 'FCFA',
          markup: data.inventory_markup_percentage || 10
        });
      });
  }, []);

  // Filter out released jobs AND jobs that are merely marked complete/ready for checkout
  const activeJobs = jobs.filter((j) => !j.released && j.status !== 'Ready/Released');

  const previousStatuses = React.useRef<Record<string, string>>({});

  useEffect(() => {
    // Check for recently unpaused jobs to alert the mechanic
    activeJobs.forEach(job => {
      const oldStatus = previousStatuses.current[job.id];
      if (oldStatus === 'Paused' && job.status === 'In Repair') {
        alert(`Job Unpaused! \n\nOwner/HOD has authorized you to continue working on vehicle: ${job.licensePlate} (${job.vehicleModel}) even though the customer quote might still be pending.`);
      }
      previousStatuses.current[job.id] = job.status;
    });
  }, [jobs]); // Rerun when jobs change

  useEffect(() => {
    // Dynamically pull in authorized additional findings for the active queue
    if (activeJobs.length === 0) return;
    const fetchAuthorized = async () => {
      const activeJobIds = activeJobs.map(j => j.id);
      const { data } = await supabase
        .from('additional_findings')
        .select('*')
        .in('parent_job_id', activeJobIds)
        .eq('status', 'customer_approved');
      if (data) {
        setAuthorizedFindings(data);
      }
    };
    fetchAuthorized();
  }, [jobs]); // Tie it to the jobs state so onSyncBay naturally re-triggers this

  const filteredJobs = filterMechanic === 'All'
    ? activeJobs
    : activeJobs.filter((j) => (j.mechanic?.full_name || j.assigned_to) === filterMechanic);

  const handlePartSourceToggle = (job: Job, source: PartSource) => {
    setLocalEdits((prev) => ({
      ...prev,
      [job.id]: { ...prev[job.id], partSource: source }
    }));
  };

  const handleCompleteJob = async (job: Job) => {
    let calculatedPartsFee = 0;

    if (job.partSource === 'Garage Inventory' || localEdits[job.id]?.partSource === 'Garage Inventory') {
      const partId = selectedInventoryPart[job.id];
      if (partId) {
        try {
          await supabase.rpc('deduct_inventory_stock', {
            used_part_id: partId,
            qty_used: 1
          });
          
          const usedPartParams = inventoryItems.find(i => i.id === partId);
          if (usedPartParams) {
             const baseCost = usedPartParams.buying_price;
             calculatedPartsFee = baseCost * (1 + (financialConfig.markup / 100));
          }
        } catch (e) {
          console.error("Failed to deduct inventory stock:", e);
        }
      }
    }

    try {
      const edits = localEdits[job.id] || {};
      const finalNotes = localNotes[job.id] !== undefined ? localNotes[job.id] : job.issueDescription;

      const jobEdits = localEdits[job.id] || {};
      
      const updatePayload: any = { status: 'pending_checkout' };

      if (jobEdits.laborFeeFcfa !== undefined) {
         updatePayload.labor_fee = jobEdits.laborFeeFcfa;
      }
      if (calculatedPartsFee > 0) {
         updatePayload.parts_fee = calculatedPartsFee;
      }
      if (jobEdits.partSource !== undefined) {
         updatePayload.part_source = jobEdits.partSource;
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update(updatePayload)
        .eq('id', job.id);
      
      if (updateError) {
        console.error("Supabase Update Error:", updateError.message, updateError.details);
        alert(`Failed to save: ${updateError.message}`);
        return;
      }

      // Safely abstract uploads branching strictly into job_media relationships
      const abstractUploadAndLink = async (urlStr: string | undefined, prefix: string) => {
        if (!urlStr || (!urlStr.startsWith('data:') && !urlStr.startsWith('blob:'))) return urlStr;
        try {
          const res = await fetch(urlStr);
          const blob = await res.blob();
          const filePath = `${job.id}/${prefix}_${Date.now()}.jpg`; 
          const { error: uploadErr } = await supabase.storage.from('garage-media').upload(filePath, blob, { contentType: blob.type });
          if (!uploadErr) {
            const { data } = supabase.storage.from('garage-media').getPublicUrl(filePath);
            await supabase.from('job_media').insert({ job_id: job.id, file_url: data.publicUrl, type: prefix });
            return data.publicUrl;
          }
        } catch { /* Suppress upload faults post-status swap */ }
        return urlStr;
      };

      // Isolate Diagnostic Voice tracking exclusively for Mechanics so Intake is untouched
      let finalVoiceUrl = edits.diagnosticVoiceNoteUrl !== undefined ? edits.diagnosticVoiceNoteUrl : job.diagnosticVoiceNoteUrl;
      const finalVoiceDur = edits.voiceNoteDurationSeconds !== undefined ? edits.voiceNoteDurationSeconds : job.voiceNoteDurationSeconds; 
      finalVoiceUrl = await abstractUploadAndLink(finalVoiceUrl, 'diagnostic_voice_note');

      let finalOldPart = edits.oldPartPhotoUrl !== undefined ? edits.oldPartPhotoUrl : job.oldPartPhotoUrl;
      finalOldPart = await abstractUploadAndLink(finalOldPart, 'old_part');

      let finalNewPart = edits.newPartPhotoUrl !== undefined ? edits.newPartPhotoUrl : job.newPartPhotoUrl;
      finalNewPart = await abstractUploadAndLink(finalNewPart, 'new_part');
      
      let finalGeneralPhoto = edits.generalJobPhotoUrl !== undefined ? edits.generalJobPhotoUrl : job.generalJobPhotoUrl;
      finalGeneralPhoto = await abstractUploadAndLink(finalGeneralPhoto, 'general_job');
      
      const photoPayload: any = {};
      if (finalOldPart && finalOldPart.startsWith('http')) photoPayload.old_part_photo_url = finalOldPart;
      if (finalNewPart && finalNewPart.startsWith('http')) photoPayload.new_part_photo_url = finalNewPart;
      if (finalGeneralPhoto && finalGeneralPhoto.startsWith('http')) photoPayload.general_job_photo_url = finalGeneralPhoto;
      
      if (Object.keys(photoPayload).length > 0) {
        await supabase.from('jobs').update(photoPayload).eq('id', job.id);
      }
      
      const updated: Job = {
        ...job,
        status: 'Ready/Released',
        diagnosticNotes: finalNotes,
        diagnosticVoiceNoteUrl: finalVoiceUrl,
        voiceNoteDurationSeconds: finalVoiceDur,
        oldPartPhotoUrl: finalOldPart,
        newPartPhotoUrl: finalNewPart,
        generalJobPhotoUrl: finalGeneralPhoto,
        partSource: edits.partSource || job.partSource,
      };
      onUpdateJob(updated); // Sync local state globally triggering parent loadJobs via queue bridge
      
      setCompletedToast({ plate: job.licensePlate, id: job.id });
      setTimeout(() => {
        setCompletedToast(null);
      }, 4500);
    } catch (e) {
      console.error("Failed to mark job complete:", e);
    }
  };

  const formatElapsedTime = (job: Job) => {
    if (job.timeElapsedMinutes !== undefined && job.timeElapsedMinutes > 0) {
      const hours = Math.floor(job.timeElapsedMinutes / 60);
      const mins = job.timeElapsedMinutes % 60;
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    }
    const diff = Date.now() - job.createdAt;
    const mins = Math.max(1, Math.floor(diff / 60000));
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. DVI / Additional Findings Widget */}
      <DviLoggingWidget activeJobs={activeJobs} />

      {/* Toast Notification when job marked complete */}
      {completedToast && (
        <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-lg border-2 border-emerald-400 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />
            <div>
              <p className="font-extrabold text-sm sm:text-base">
                Job Complete for {completedToast.plate}!
              </p>
              <p className="text-xs text-emerald-200">
                Job sent to HOD for Checkout. The vehicle is removed from your active queue.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToCheckout(completedToast.id)}
            className="min-h-[44px] px-3.5 py-1.5 bg-[#34D399] text-[#0E2829] rounded-lg font-black text-xs uppercase tracking-wider shrink-0 hover:bg-emerald-300 active:scale-95 shadow-xs"
          >
            Go to Billing
          </button>
        </div>
      )}

      {/* Screen Header & Filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-300 pb-2">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>Mechanic Queue</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-800 text-white">
                {filteredJobs.length} active
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Apprentice & Technician Workshop Board • Touch Target Optimized
            </p>
          </div>
          
          {onSyncBay && (
            <button 
              onClick={async () => { 
                setIsSyncing(true);
                try {
                  await onSyncBay();
                } finally {
                  setTimeout(() => setIsSyncing(false), 500);
                }
              }} 
              disabled={isSyncing}
              className="self-start sm:self-auto px-5 py-2.5 bg-[#0E2829] hover:bg-slate-800 text-[#34D399] text-sm font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition active:scale-95 shadow-md border-2 border-[#142F30] disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} /> Refresh Jobs
            </button>
          )}
        </div>

        {/* Mechanic filter pills (Hidden for technicians) */}
        {userRole !== 'worker' && mechanicFilters.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {mechanicFilters.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMechanic(m)}
                className={`min-h-[40px] px-3 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                  filterMechanic === m
                    ? 'bg-[#0E2829] text-[#34D399] border-[#142F30] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-stone-50'
                }`}
              >
                {m === 'All' ? 'All Bays' : m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List of Active Job Cards on a Warm Stone background (bg-stone-100) */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#0E2829] border-l-4 border-[#34D399] mx-auto flex items-center justify-center p-2 text-white shadow-xs">
            <MotologaLogo variant="icon" size="md" accentColor="#34D399" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-lg">No Active Repairs in Queue</h3>
          <p className="text-sm text-slate-500">
            {filterMechanic === 'All'
              ? 'All jobs have been released or no vehicles logged today.'
              : `No vehicles currently assigned to ${filterMechanic}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const timeStr = formatElapsedTime(job);
            const isCompleted = job.status === 'Ready/Released';

            return (
              <div
                key={job.id}
                id={`job-card-${job.id}`}
                className={`bg-white rounded-2xl border ${job.status === 'Paused' ? 'border-rose-400/50' : 'border-slate-200'} shadow-sm p-4 sm:p-5 space-y-4 transition-shadow hover:shadow-md relative overflow-hidden`}
              >
                {/* PAUSED LOCK OVERLAY */}
                {job.status === 'Paused' && (
                  <div className="absolute inset-0 z-50 bg-stone-100/70 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 border-[4px] border-rose-500/20 cursor-not-allowed">
                    <div className="bg-rose-100 p-4 rounded-full mb-3 shadow-sm border border-rose-200 animate-pulse">
                      <AlertTriangle className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="font-black text-rose-700 text-lg sm:text-xl uppercase tracking-tight text-center">Job Paused</h3>
                    <p className="text-center text-rose-700 font-bold text-xs mt-1.5 max-w-[220px] leading-tight drop-shadow-sm">Work suspended! Owner/HOD is awaiting customer authorization on a critical quote.</p>
                  </div>
                )}
                {/* CARD LAYOUT: Cameroon License Plate badge at top, Status Chip (In Repair), and Time Elapsed */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    {/* Cameroon License Plate Badge */}
                    <LicensePlateBadge plate={job.licensePlate} size="md" />
                    <div className="text-xs font-extrabold text-slate-800 flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span>{job.vehicleModel}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{job.customerPhone}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Status Chip */}
                    <StatusChip status={job.status} size="md" />

                    {/* Time Elapsed */}
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-slate-600 bg-stone-100 px-2 py-0.5 rounded border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Elapsed: {timeStr}</span>
                    </div>
                  </div>
                </div>

                {/* AUTHORIZED ADDITIONAL WORK */}
                {authorizedFindings.filter(f => f.parent_job_id === job.id).length > 0 && (
                  <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3 shadow-sm animate-in fade-in">
                    <h4 className="text-xs font-black text-emerald-700 uppercase flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4" /> Authorized Additional Work
                    </h4>
                    <div className="space-y-2">
                      {authorizedFindings.filter(f => f.parent_job_id === job.id).map(f => (
                        <div key={f.id} className="bg-white border border-emerald-200 rounded-lg p-2.5">
                          {f.worker_voice_note_url && (
                             <div className="mb-2">
                               <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Approved Voice Note</span>
                               <audio controls src={f.worker_voice_note_url} className="w-full h-8" />
                             </div>
                          )}
                          {f.photo_url && (
                             <img src={f.photo_url} alt="Authorized Work" className="w-full h-32 object-cover border border-emerald-100 rounded-lg" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Mechanic & Issue Description */}
                <div className="bg-stone-50 rounded-xl p-3 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#142F30] text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Assigned Mechanic
                      </span>
                      <span className="font-bold text-slate-700 block mt-0.5 truncate max-w-full">
                        {job.mechanic?.full_name || 'Assigned Mechanic'}
                      </span>
                    </div>
                  </div>

                  {/* Newly added Read-Only Customer Intake Summary */}
                  <div className="bg-[#142F30] rounded-xl p-3 border border-emerald-900 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider mb-2 flex items-center gap-1.5">
                      Customer Complaint & Intake Notes
                    </h4>
                    <p className="text-sm font-medium text-emerald-50 mb-3 whitespace-pre-wrap leading-relaxed">
                      {job.issueDescription || <span className="italic text-emerald-700">No text notes recorded at intake.</span>}
                    </p>
                    
                    {job.voiceNoteUrl && (
                      <div className="bg-[#0b1c1d] rounded-lg p-2 flex items-center gap-3">
                         <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest shrink-0">Intake Audio</span>
                         <audio controls src={job.voiceNoteUrl} className="h-8 max-w-[200px]" />
                      </div>
                    )}
                  </div>

                  {/* Diagnostic Note */}
                  <div className="space-y-1.5 pt-2">
                    <label
                      htmlFor={`diagnostic-note-${job.id}`}
                      className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between"
                    >
                      <span>Diagnostic Note</span>
                      {saveStatus[`diagnostic-note-${job.id}`] ? (
                        <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1 animate-in fade-in duration-300">
                          <CheckCircle2 className="w-3 h-3" />
                          {saveStatus[`diagnostic-note-${job.id}`]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal lowercase">
                          edit or record voice memo
                        </span>
                      )}
                    </label>
                    <textarea
                      id={`diagnostic-note-${job.id}`}
                      rows={2}
                      value={localNotes[job.id] !== undefined ? localNotes[job.id] : (job.diagnosticNotes || '')}
                      onChange={(e) => setLocalNotes((prev) => ({ ...prev, [job.id]: e.target.value }))}
                      placeholder="Mechanic diagnostic findings, mechanical faults, or repairs needed..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none transition-all resize-y"
                    />
                  </div>

                  {/* Voice Intake Field (Directly under diagnostic note) */}
                  <VoiceRecorderField
                    audioUrl={(localEdits[job.id]?.diagnosticVoiceNoteUrl !== undefined ? localEdits[job.id]?.diagnosticVoiceNoteUrl : job.diagnosticVoiceNoteUrl) || ''}
                    durationSeconds={(localEdits[job.id]?.voiceNoteDurationSeconds !== undefined ? localEdits[job.id]?.voiceNoteDurationSeconds : job.voiceNoteDurationSeconds) || 0}
                    onAudioChange={(url, duration) => {
                      setLocalEdits(prev => ({
                        ...prev, [job.id]: {
                          ...prev[job.id],
                          diagnosticVoiceNoteUrl: url,
                          voiceNoteDurationSeconds: duration
                        }
                      }));
                    }}
                    label="Diagnostic Voice Note"
                    promptTitle="Record Diagnostic Voice Memo"
                    promptSubtitle="Speak fault diagnosis or record engine noise instead of typing"
                    helperText="Voice note saved directly to this repair record."
                    buttonId={`record-voice-note-${job.id}`}
                  />
                  
                </div>

                {/* ACTION AREA: Two side-by-side buttons for "Photo: Old Part" and "Photo: New Part" */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Parts Verification (Proof of Replacement)
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* Photo: Old Part Button */}
                    <button
                      id={`photo-old-part-${job.id}`}
                      type="button"
                      onClick={() => setActivePhotoTarget({ jobId: job.id, type: 'old-part' })}
                      className={`min-h-[50px] p-2 sm:p-2.5 rounded-xl border-2 flex items-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer ${
                        (localEdits[job.id]?.oldPartPhotoUrl || job.oldPartPhotoUrl)
                          ? 'bg-amber-50 border-amber-400 text-amber-950'
                          : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          (localEdits[job.id]?.oldPartPhotoUrl || job.oldPartPhotoUrl) ? 'bg-amber-600 text-white' : 'bg-slate-700 text-amber-300'
                        }`}
                      >
                        {(localEdits[job.id]?.oldPartPhotoUrl || job.oldPartPhotoUrl) ? (
                          <img
                            src={localEdits[job.id]?.oldPartPhotoUrl || job.oldPartPhotoUrl}
                            alt="Old part"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <span className="text-[11px] sm:text-xs font-black block leading-tight truncate">
                          Old Part
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-tight truncate">
                          {job.oldPartPhotoUrl ? 'Worn Verified' : 'Tap to snap'}
                        </span>
                      </div>
                      {job.oldPartPhotoUrl && (
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 stroke-[3]" />
                      )}
                    </button>

                    {/* Photo: New Part Button */}
                    <button
                      id={`photo-new-part-${job.id}`}
                      type="button"
                      onClick={() => setActivePhotoTarget({ jobId: job.id, type: 'new-part' })}
                      className={`min-h-[50px] p-2 sm:p-2.5 rounded-xl border-2 flex items-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer ${
                        (localEdits[job.id]?.newPartPhotoUrl || job.newPartPhotoUrl)
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          (localEdits[job.id]?.newPartPhotoUrl || job.newPartPhotoUrl) ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-emerald-300'
                        }`}
                      >
                        {(localEdits[job.id]?.newPartPhotoUrl || job.newPartPhotoUrl) ? (
                          <img
                            src={localEdits[job.id]?.newPartPhotoUrl || job.newPartPhotoUrl}
                            alt="New part"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <span className="text-[11px] sm:text-xs font-black block leading-tight truncate">
                          New Part
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-tight truncate">
                          {job.newPartPhotoUrl ? 'Fitted Verified' : 'Tap to snap'}
                        </span>
                      </div>
                      {job.newPartPhotoUrl && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      )}
                    </button>
                  </div>

                  {/* FULL WIDTH General Job Photo Button */}
                  <div className="pt-2">
                    <button
                      id={`photo-general-job-${job.id}`}
                      type="button"
                      onClick={() => setActivePhotoTarget({ jobId: job.id, type: 'general-job' })}
                      className={`w-full min-h-[50px] p-2 sm:p-2.5 rounded-xl border-2 flex items-center justify-between gap-3 transition-all active:scale-98 shadow-xs cursor-pointer ${
                        (localEdits[job.id]?.generalJobPhotoUrl || job.generalJobPhotoUrl)
                          ? 'bg-sky-50 border-sky-400 text-sky-950'
                          : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            (localEdits[job.id]?.generalJobPhotoUrl || job.generalJobPhotoUrl) ? 'bg-sky-600 text-white' : 'bg-slate-700 text-sky-300'
                          }`}
                        >
                          {(localEdits[job.id]?.generalJobPhotoUrl || job.generalJobPhotoUrl) ? (
                            <img
                              src={localEdits[job.id]?.generalJobPhotoUrl || job.generalJobPhotoUrl}
                              alt="General job"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <span className="text-[11px] sm:text-xs font-black block leading-tight">
                            General Job Photo (Optional)
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5 truncate">
                            {job.generalJobPhotoUrl ? 'Photo Logged' : 'Use this for labor-only jobs like wiring, cleaning, or diagnostics.'}
                          </span>
                        </div>
                      </div>
                      {(localEdits[job.id]?.generalJobPhotoUrl || job.generalJobPhotoUrl) && (
                        <Check className="w-4 h-4 text-sky-600 shrink-0 stroke-[3]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* SEGMENTED CONTROL: A toggle for Parts Sourced */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Parts Procurement Source
                  </span>
                  <div className="grid grid-cols-3 p-1 bg-stone-100 rounded-xl border border-slate-300 gap-1 text-[10px] sm:text-xs">
                    <button
                      id={`toggle-customer-part-${job.id}`}
                      type="button"
                      onClick={() => handlePartSourceToggle(job, 'Customer-Supplied Part')}
                      className={`min-h-[40px] px-1 py-1 rounded-lg font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        (localEdits[job.id]?.partSource || job.partSource) === 'Customer-Supplied Part'
                          ? 'bg-[#0E2829] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className={`w-3.5 h-3.5 shrink-0 ${(localEdits[job.id]?.partSource || job.partSource) === 'Customer-Supplied Part' ? 'text-emerald-400' : ''}`} />
                      <span className="truncate">Customer</span>
                    </button>
                    
                    <button
                      id={`toggle-worker-part-${job.id}`}
                      onClick={() => handlePartSourceToggle(job, 'Worker Bought')}
                      className={`min-h-[40px] px-1 py-1 rounded-lg font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        (localEdits[job.id]?.partSource || job.partSource) === 'Worker Bought'
                          ? 'bg-[#0E2829] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className={`w-3.5 h-3.5 shrink-0 ${(localEdits[job.id]?.partSource || job.partSource) === 'Worker Bought' ? 'text-sky-400' : ''}`} />
                      <span className="truncate">Worker Bought</span>
                    </button>

                    <button
                      id={`toggle-garage-inventory-${job.id}`}
                      onClick={() => handlePartSourceToggle(job, 'Garage Inventory')}
                      className={`min-h-[40px] px-1 py-1 rounded-lg font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        ((localEdits[job.id]?.partSource || job.partSource) === 'Garage Inventory' || (localEdits[job.id]?.partSource || job.partSource) === 'Garage Stock')
                          ? 'bg-[#0E2829] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Package className={`w-3.5 h-3.5 shrink-0 ${((localEdits[job.id]?.partSource || job.partSource) === 'Garage Inventory' || (localEdits[job.id]?.partSource || job.partSource) === 'Garage Stock') ? 'text-amber-400' : ''}`} />
                      <span className="truncate">Garage Inventory</span>
                    </button>
                  </div>
                  
                  {/* Dynamic Dropdown for specific Inventory Part selection */}
                  {((localEdits[job.id]?.partSource || job.partSource) === 'Garage Inventory' || (localEdits[job.id]?.partSource || job.partSource) === 'Garage Stock') && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <select
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        value={selectedInventoryPart[job.id] || ''}
                        onChange={(e) => setSelectedInventoryPart(prev => ({ ...prev, [job.id]: e.target.value }))}
                      >
                        <option value="" disabled>Select a part from inventory...</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.part_name} {item.part_number ? `(${item.part_number})` : ''} - {item.quantity_in_stock} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* PRIMARY CTA: A full-width Mint Green button: "Mark Job Complete" */}
                <div>
                  {isCompleted ? (
                    <div className="w-full min-h-[48px] rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Job Completed • Ready for Customer Checkout</span>
                    </div>
                  ) : (
                    <button
                      id={`mark-complete-btn-${job.id}`}
                      type="button"
                      onClick={() => handleCompleteJob(job)}
                      className="w-full min-h-[50px] rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-sm border border-[#1EBE5D] cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      <span>Complete Job & Send to Checkout</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Modal for Old/New Part */}
      {activePhotoTarget && (
        <PhotoCaptureModal
          isOpen={true}
          onClose={() => setActivePhotoTarget(null)}
          title={
            activePhotoTarget.type === 'old-part'
              ? 'Capture Old Replaced Part'
              : activePhotoTarget.type === 'new-part'
              ? 'Capture New Replacement Part'
              : 'Capture General Job Photo'
          }
          category={activePhotoTarget.type}
          currentPhotoUrl={
            activePhotoTarget.type === 'old-part'
              ? jobs.find((j) => j.id === activePhotoTarget.jobId)?.oldPartPhotoUrl
              : activePhotoTarget.type === 'new-part'
              ? jobs.find((j) => j.id === activePhotoTarget.jobId)?.newPartPhotoUrl
              : jobs.find((j) => j.id === activePhotoTarget.jobId)?.generalJobPhotoUrl
          }
          onPhotoCaptured={(url) => {
            if (activePhotoTarget) {
              if (activePhotoTarget.type === 'old-part') {
                setLocalEdits(prev => ({
                  ...prev, [activePhotoTarget.jobId]: { ...prev[activePhotoTarget.jobId], oldPartPhotoUrl: url }
                }));
              } else if (activePhotoTarget.type === 'new-part') {
                setLocalEdits(prev => ({
                  ...prev, [activePhotoTarget.jobId]: { ...prev[activePhotoTarget.jobId], newPartPhotoUrl: url }
                }));
              } else if (activePhotoTarget.type === 'general-job') {
                setLocalEdits(prev => ({
                  ...prev, [activePhotoTarget.jobId]: { ...prev[activePhotoTarget.jobId], generalJobPhotoUrl: url }
                }));
              }
            }
          }}
        />
      )}
    </div>
  );
};
