import React, { useState } from 'react';
import { Job, PartSource, JobStatus, DeferredRepair } from '../types';
import { LicensePlateBadge } from './LicensePlateBadge';
import { StatusChip } from './StatusChip';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { MotologaLogo } from './MotologaLogo';
import { VoiceRecorderField } from './VoiceRecorderField';
import { RecallDashboard } from './RecallDashboard';
import { Clock, Camera, CheckCircle2, User, Package, ShieldAlert, Check, Phone } from 'lucide-react';

interface MechanicQueueScreenProps {
  jobs: Job[];
  deferredRepairs?: DeferredRepair[];
  onUpdateRepairs?: (repairs: DeferredRepair[]) => void;
  onUpdateJob: (updatedJob: Job) => void;
  onNavigateToCheckout: (jobId?: string) => void;
}

export const MechanicQueueScreen: React.FC<MechanicQueueScreenProps> = ({
  jobs,
  deferredRepairs = [],
  onUpdateRepairs,
  onUpdateJob,
  onNavigateToCheckout,
}) => {
  const [filterMechanic, setFilterMechanic] = useState<string>('All');
  const [activePhotoTarget, setActivePhotoTarget] = useState<{
    jobId: string;
    type: 'old-part' | 'new-part';
  } | null>(null);

  const [completedToast, setCompletedToast] = useState<{ plate: string; id: string } | null>(null);

  // Filter jobs that are not released yet
  const activeJobs = jobs.filter((j) => !j.released);

  const filteredJobs = filterMechanic === 'All'
    ? activeJobs
    : activeJobs.filter((j) => (j.assigned_to_profile?.full_name || j.assigned_to) === filterMechanic);

  const handlePartSourceToggle = (job: Job, source: PartSource) => {
    onUpdateJob({
      ...job,
      partSource: source,
    });
  };

  const handleMarkComplete = (job: Job) => {
    const updated: Job = {
      ...job,
      status: 'Ready/Released',
    };
    onUpdateJob(updated);
    setCompletedToast({ plate: job.licensePlate, id: job.id });

    setTimeout(() => {
      setCompletedToast(null);
    }, 4500);
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
      {/* 1. The Owner's Morning Feed: Follow-Ups Due */}
      <RecallDashboard
        repairs={deferredRepairs}
        onUpdateRepairs={onUpdateRepairs}
      />

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
                Moved to Ready/Released. Owner can now proceed to WhatsApp checkout.
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
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>Mechanic Queue</span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-800 text-white">
              {filteredJobs.length} active
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Apprentice & Technician Workshop Board • Touch Target Optimized
          </p>
        </div>

        {/* Mechanic filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {['All', 'Jean', 'Paul', 'Michel', 'Ibrahim'].map((m) => (
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
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4 transition-shadow hover:shadow-md"
              >
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
                      <span className="font-extrabold text-slate-800 text-sm">
                        {job.assigned_to_profile?.full_name || job.assigned_to}
                      </span>
                    </div>
                  </div>

                  {/* Diagnostic Note */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`diagnostic-note-${job.id}`}
                      className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between"
                    >
                      <span>Diagnostic Note</span>
                      <span className="text-[10px] text-slate-400 font-normal lowercase">
                        edit or record voice memo
                      </span>
                    </label>
                    <textarea
                      id={`diagnostic-note-${job.id}`}
                      rows={2}
                      value={job.issueDescription || ''}
                      onChange={(e) =>
                        onUpdateJob({
                          ...job,
                          issueDescription: e.target.value,
                        })
                      }
                      placeholder="Diagnostic findings, mechanical faults, or repairs needed..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none transition-all resize-y"
                    />
                  </div>

                  {/* Voice Intake Field (Directly under diagnostic note) */}
                  <VoiceRecorderField
                    audioUrl={job.voiceNoteUrl || ''}
                    durationSeconds={job.voiceNoteDurationSeconds || 0}
                    onAudioChange={(url, duration) => {
                      onUpdateJob({
                        ...job,
                        voiceNoteUrl: url,
                        voiceNoteDurationSeconds: duration,
                      });
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
                        job.oldPartPhotoUrl
                          ? 'bg-amber-50 border-amber-400 text-amber-950'
                          : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          job.oldPartPhotoUrl ? 'bg-amber-600 text-white' : 'bg-slate-700 text-amber-300'
                        }`}
                      >
                        {job.oldPartPhotoUrl ? (
                          <img
                            src={job.oldPartPhotoUrl}
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
                        job.newPartPhotoUrl
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          job.newPartPhotoUrl ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-emerald-300'
                        }`}
                      >
                        {job.newPartPhotoUrl ? (
                          <img
                            src={job.newPartPhotoUrl}
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
                </div>

                {/* SEGMENTED CONTROL: A toggle for "Garage Stock" vs "Customer-Supplied Part" */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Parts Procurement Source
                  </span>
                  <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl border border-slate-300">
                    <button
                      id={`toggle-garage-stock-${job.id}`}
                      type="button"
                      onClick={() => handlePartSourceToggle(job, 'Garage Stock')}
                      className={`min-h-[48px] px-2 sm:px-3 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                        job.partSource === 'Garage Stock'
                          ? 'bg-[#0E2829] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Package className={`w-4 h-4 shrink-0 ${job.partSource === 'Garage Stock' ? 'text-amber-400' : ''}`} />
                      <span className="truncate">Garage Stock</span>
                    </button>

                    <button
                      id={`toggle-customer-part-${job.id}`}
                      type="button"
                      onClick={() => handlePartSourceToggle(job, 'Customer-Supplied Part')}
                      className={`min-h-[48px] px-2 sm:px-3 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                        job.partSource === 'Customer-Supplied Part'
                          ? 'bg-[#0E2829] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className={`w-4 h-4 shrink-0 ${job.partSource === 'Customer-Supplied Part' ? 'text-emerald-400' : ''}`} />
                      <span className="truncate">Customer Part</span>
                    </button>
                  </div>
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
                      onClick={() => handleMarkComplete(job)}
                      className="w-full min-h-[50px] rounded-xl bg-[#34D399] hover:bg-[#10B981] active:scale-[0.99] text-[#0E2829] font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-sm border border-emerald-600 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      <span>Mark Job Complete</span>
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
              : 'Capture New Replacement Part'
          }
          category={activePhotoTarget.type}
          currentPhotoUrl={
            activePhotoTarget.type === 'old-part'
              ? jobs.find((j) => j.id === activePhotoTarget.jobId)?.oldPartPhotoUrl
              : jobs.find((j) => j.id === activePhotoTarget.jobId)?.newPartPhotoUrl
          }
          onPhotoCaptured={(url) => {
            const targetJob = jobs.find((j) => j.id === activePhotoTarget.jobId);
            if (targetJob) {
              if (activePhotoTarget.type === 'old-part') {
                onUpdateJob({ ...targetJob, oldPartPhotoUrl: url });
              } else {
                onUpdateJob({ ...targetJob, newPartPhotoUrl: url });
              }
            }
          }}
        />
      )}
    </div>
  );
};
