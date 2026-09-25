import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit3, Lock, RefreshCw, Mic } from 'lucide-react';
import { promoteFindingToAppointment, createDirectAppointment } from '../lib/api';
import { Department } from '../types';
import { CustomerVehicleIdentity } from './CustomerVehicleIdentity';

export interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'additional_finding' | 'direct_booking' | 'checkout' | 'reschedule';
  
  // Pre-filled immutable tracking context
  garageId?: string;
  departmentId?: string;
  findingId?: string;
  appointmentId?: string;
  
  // Locked visual states
  customerName?: string;
  vehicleLabel?: string; 
  initialDescription?: string;
  
  // Propagated successfully up
  onSchedulingSuccess?: () => void;
  userRole?: 'hod' | 'owner';
  departments?: Department[];
}

export const ScheduleAppointmentModal: React.FC<ScheduleAppointmentModalProps> = ({
  isOpen,
  onClose,
  mode,
  garageId,
  departmentId,
  findingId,
  appointmentId,
  customerName = "Active Customer",
  vehicleLabel = "Attached Vehicle",
  initialDescription = "",
  userRole = 'hod',
  departments = [],
  onSchedulingSuccess
}) => {
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Direct Booking States
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [directCustomerName, setDirectCustomerName] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setScheduledDate('');
      setScheduledTime('');
      setIssueDescription(initialDescription);
      setLicensePlate('');
      setCustomerPhone('');
      setDirectCustomerName('');
      setVehicleModel('');
      setSelectedDeptId('');
      setErrorMsg('');
      setLoading(false);
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioBlob(null);
      setAudioUrl('');
    }
  }, [isOpen, initialDescription]);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setErrorMsg('Please select a valid target date.');
      return;
    }
    
    const hasText = issueDescription.trim().length > 0;
    const hasVoice = Boolean(audioBlob || audioUrl);
    
    if (!hasText && !hasVoice) {
      setErrorMsg('You must provide an issue context via text or a voice recording.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      let finalDescription: string | null = issueDescription.trim() || null;
      let finalVoiceUrl: string | null = audioUrl || null;
      
      if (audioBlob) {
        const fileName = `appointment_voice_note_${Date.now()}.webm`;
        const { supabase } = await import('../lib/supabase');
        const { error: uploadErr } = await supabase.storage.from('garage-media').upload(fileName, audioBlob, { contentType: 'audio/webm' });
        
        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from('garage-media').getPublicUrl(fileName);
          finalVoiceUrl = pubData.publicUrl;
        } else {
          console.error('Audio upload failed:', uploadErr);
          if (finalDescription) {
             const userConfirmed = window.confirm("Voice upload failed, but you provided text. Continue and submit with text only?");
             if (!userConfirmed) {
                setLoading(false);
                return;
             }
          } else {
             throw new Error("Voice recording upload failed. Please try again or type the issue description.");
          }
        }
      }

      if (mode === 'additional_finding') {
        if (!findingId || !departmentId) {
          throw new Error("Critical Schema Violation: Missing Finding ID or Department ID bindings.");
        }
        await promoteFindingToAppointment(
           findingId, departmentId, scheduledDate, scheduledTime, finalDescription, finalVoiceUrl
        );
      } else if (mode === 'reschedule') {
         if (!appointmentId) {
            throw new Error("Critical Schema Violation: Missing Appointment ID for reschedule hook.");
         }
         const { updateAppointmentStatus } = await import('../lib/api');
         await updateAppointmentStatus(appointmentId, 'scheduled', {
           scheduled_date: scheduledDate,
           scheduled_time: scheduledTime || null,
           issue_description: finalDescription,
           // Preserve or update audio 
           ...(finalVoiceUrl ? { voice_note_url: finalVoiceUrl } : {})
         });
      } else if (mode === 'direct_booking') {
         const activeDeptId = userRole === 'owner' ? selectedDeptId : departmentId;
         if (!garageId || !activeDeptId) {
            throw new Error("Critical Schema Violation: Missing Garage ID or Department ID bindings.");
         }
         await createDirectAppointment(
            garageId, activeDeptId, directCustomerName, customerPhone,
            licensePlate, vehicleModel, scheduledDate, scheduledTime,
            finalDescription, finalVoiceUrl, 'direct_booking'
         );
      } else if (mode === 'checkout') {
         if (!garageId) throw new Error("Critical Schema Violation: Missing Garage ID.");
         const splitLabel = vehicleLabel.split(' - ');
         
         await createDirectAppointment(
            garageId, departmentId || '', customerName, customerName, 
            splitLabel.length > 1 ? splitLabel[1] : vehicleLabel,
            splitLabel[0] || vehicleLabel,
            scheduledDate, scheduledTime, finalDescription, finalVoiceUrl, 'checkout'
         );
      } else {
         throw new Error("Direct booking and checkout scheduling not implemented correctly.");
      }
      
      onSchedulingSuccess?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'A database collision prevented scheduling.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 bg-black/50 overflow-hidden">
      {/* Blurred overlay absolutely constrained */}
      <div className="absolute inset-0 backdrop-blur-sm transition-opacity" onClick={loading ? undefined : onClose} />

      <div className="relative w-[95%] sm:w-full mx-auto max-w-lg max-h-[85vh] flex flex-col bg-gray-900 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div className="bg-sky-950/40 border-b border-sky-900/50 px-5 py-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            Schedule Follow-Up Booking
          </h2>
          <p className="text-xs text-sky-200/60 font-medium mt-1 uppercase tracking-wider">
            {mode === 'additional_finding' ? 'Deferring Additional Job' : 'Appointment Engine'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {errorMsg && (
            <div className="bg-rose-950/30 border border-rose-900/50 text-rose-400 text-xs font-bold p-3 rounded-xl flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Locked Identity Bounds OR Interactive Identity Forms */}
          {mode === 'direct_booking' ? (
             <div className="flex flex-col gap-4">
               {userRole === 'owner' && (
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Target Department <span className="text-rose-500">*</span></label>
                   <select
                     value={selectedDeptId}
                     onChange={e => setSelectedDeptId(e.target.value)}
                     className="w-full bg-stone-950 border border-stone-700/80 rounded-xl px-4 py-3 text-sm font-medium text-stone-200 focus:outline-none focus:border-sky-500/50"
                     required
                   >
                     <option value="" disabled>-- Select Department --</option>
                     {departments.map(d => (
                       <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                   </select>
                 </div>
               )}
               <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800">
                  <CustomerVehicleIdentity 
                     licensePlate={licensePlate} setLicensePlate={setLicensePlate}
                     customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
                     customerName={directCustomerName} setCustomerName={setDirectCustomerName}
                     vehicleModel={vehicleModel} setVehicleModel={setVehicleModel}
                  />
               </div>
             </div>
          ) : (
             <div className="flex flex-col gap-2">
                <div className="bg-stone-950/50 border border-stone-800/80 px-3 py-2 rounded-lg flex items-center justify-between opacity-80 select-none">
                    <span className="text-xs text-stone-500 font-black uppercase tracking-wider">Vehicle</span>
                    <div className="flex items-center gap-1.5 text-stone-300 text-sm font-medium">
                      {vehicleLabel} <Lock className="w-3 h-3 text-stone-600" />
                    </div>
                </div>
                <div className="bg-stone-950/50 border border-stone-800/80 px-3 py-2 rounded-lg flex items-center justify-between opacity-80 select-none">
                    <span className="text-xs text-stone-500 font-black uppercase tracking-wider">Attached Client</span>
                    <div className="flex items-center gap-1.5 text-stone-300 text-sm font-medium">
                      {customerName} <Lock className="w-3 h-3 text-stone-600" />
                    </div>
                </div>
             </div>
          )}

          <div className="w-full h-px bg-gradient-to-r from-stone-800/0 via-stone-800 to-stone-800/0" />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-stone-500" /> Issue Context / Procedure Notes
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 border shadow-sm active:scale-95 ${isRecording ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse shadow-rose-900/50' : 'bg-emerald-950/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/40 border-emerald-800/50 shadow-black/50'}`}
                title={isRecording ? "Stop Recording" : "Record Voice Note"}
              >
                <Mic className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isRecording ? "Recording..." : "Voice Note"}
                </span>
              </button>
            </div>
            {audioUrl && (
              <div className="mt-1 mb-2 bg-stone-950 border border-emerald-900/40 rounded-xl p-3 flex items-center justify-between">
                <audio controls src={audioUrl} className="h-8 shadow-sm rounded max-w-[80%] [&::-webkit-media-controls-panel]:bg-stone-800 [&::-webkit-media-controls-current-time-display]:text-white [&::-webkit-media-controls-time-remaining-display]:text-white" />
                <button type="button" onClick={() => { setAudioBlob(null); setAudioUrl(''); }} className="text-xs text-rose-400 hover:text-rose-300 font-bold uppercase transition-colors">Clear</button>
              </div>
            )}
            <textarea
              className="mt-1 w-full bg-stone-950 border border-stone-700/80 rounded-xl px-4 py-3 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/40 min-h-[90px] transition-all"
              placeholder="Provide repair specifics for the mechanic..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 flex items-center gap-1.5 bg-emerald-950/20 px-2 py-1 rounded w-fit border border-emerald-900/30">
                 <Calendar className="w-3.5 h-3.5" /> Target Date <span className="text-rose-500">*</span>
               </label>
               <input
                 type="date"
                 required
                 className="mt-1 w-full bg-stone-950 border border-stone-700/80 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition-all [&::-webkit-calendar-picker-indicator]:invert-[0.7]"
                 value={scheduledDate}
                 onChange={(e) => setScheduledDate(e.target.value)}
                 onClick={(e) => { if ('showPicker' in HTMLInputElement.prototype) { (e.target as HTMLInputElement).showPicker(); } }}
                 disabled={loading}
               />
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-sky-400/80 flex items-center gap-1.5 bg-sky-950/20 px-2 py-1 rounded w-fit border border-sky-900/30">
                 <Clock className="w-3.5 h-3.5" /> Time (Optional)
               </label>
               <input
                 type="time"
                 className="mt-1 w-full bg-stone-950 border border-stone-700/80 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/40 transition-all [&::-webkit-calendar-picker-indicator]:invert-[0.7]"
                 value={scheduledTime}
                 onChange={(e) => setScheduledTime(e.target.value)}
                 onClick={(e) => { if ('showPicker' in HTMLInputElement.prototype) { (e.target as HTMLInputElement).showPicker(); } }}
                 disabled={loading}
               />
             </div>
          </div>

          </div>

          {/* Action Row */}
          <div className="flex gap-3 p-4 border-t border-stone-800">
             <button
               type="button"
               disabled={loading}
               onClick={onClose}
               className="flex-shrink-0 px-6 py-3.5 bg-transparent hover:bg-stone-800 text-stone-400 font-bold text-sm rounded-xl transition-all"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={loading || !scheduledDate}
               className="flex-1 px-4 py-3.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black uppercase tracking-wider text-sm rounded-xl transition-all shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? (
                 <><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Bridging RPC...</>
               ) : (
                 'Schedule Appointment'
               )}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
