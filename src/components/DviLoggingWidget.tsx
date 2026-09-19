import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Square, Upload, CheckCircle2, FileAudio, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Job } from '../types';

interface DviLoggingWidgetProps {
  activeJobs: Job[];
}

export const DviLoggingWidget: React.FC<DviLoggingWidgetProps> = ({ activeJobs }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeJobs.length > 0 && !selectedJobId && activeJobs.some(j => !j.released)) {
      setSelectedJobId(activeJobs.find(j => !j.released)?.id || activeJobs[0].id);
    }
  }, [activeJobs, selectedJobId]);

  const toggleRecording = async () => {
    setError(null);
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setAudioBlob(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingDuration(0);
        setAudioBlob(null);

        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error("Microphone error", err);
        setError("Microphone access denied or unavailable.");
      }
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!selectedJobId) {
      setError("Please select an active vehicle to log findings against.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication user not found");

      let finalPhotoUrl = null;
      let finalAudioUrl = null;

      // Upload Photo
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `dvi/${user.id}-${Date.now()}-photo.${ext}`;
        const { error: photoErr } = await supabase.storage.from('garage-media').upload(path, photoFile);
        if (photoErr) throw photoErr;
        
        const { data: { publicUrl } } = supabase.storage.from('garage-media').getPublicUrl(path);
        finalPhotoUrl = publicUrl;
      }

      // Upload Audio
      if (audioBlob) {
        const path = `dvi/${user.id}-${Date.now()}-audio.webm`;
        const { error: audioErr } = await supabase.storage.from('garage-media').upload(path, audioBlob, { contentType: 'audio/webm' });
        if (audioErr) throw audioErr;

        const { data: { publicUrl } } = supabase.storage.from('garage-media').getPublicUrl(path);
        finalAudioUrl = publicUrl;
      }

      // Insert DB
      const { error: insertErr } = await supabase.from('additional_findings').insert([{
        parent_job_id: selectedJobId,
        worker_id: user.id,
        photo_url: finalPhotoUrl,
        worker_voice_note_url: finalAudioUrl,
        status: 'pending_approval'
      }]);

      if (insertErr) throw insertErr;

      // Success
      setShowSuccess(true);
      setPhotoFile(null);
      setPhotoPreview(null);
      setAudioBlob(null);
      setRecordingDuration(0);

      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit additional findings to HOD.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (activeJobs.length === 0) return null; // Hide completely if they have no active jobs

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-lg p-5 text-white flex flex-col space-y-4">
      <div>
        <h3 className="text-lg font-black text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Log Additional Finding
        </h3>
        <p className="text-xs text-stone-400 mt-1 font-medium">Record voice note and photo evidence for HOD approval.</p>
      </div>

      {error && (
        <div className="bg-rose-950/40 text-rose-300 border border-rose-500/30 p-2.5 rounded-xl text-xs">
          {error}
        </div>
      )}

      {showSuccess && (
        <div className="bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Successfully submitted to HOD!
        </div>
      )}

      {activeJobs.length > 1 && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Target Vehicle</label>
          <select 
            value={selectedJobId} 
            onChange={e => setSelectedJobId(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
          >
            {activeJobs.filter(j => !j.released).map(job => (
              <option key={job.id} value={job.id}>{job.vehicleModel} - {job.licensePlate}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Photo Capture Block */}
        <div className="flex flex-col gap-2">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="w-full bg-stone-950/60 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#0E2829] file:text-emerald-400 cursor-pointer"
            onChange={handlePhotoCapture}
          />
          {photoPreview && (
            <img src={photoPreview} alt="Preview" className="h-20 w-20 object-cover rounded shadow-md border border-stone-700" />
          )}
        </div>

        {/* Audio Mic Block */}
        <button 
          type="button"
          onClick={toggleRecording}
          className={`h-[80px] rounded-xl flex flex-col items-center justify-center transition border ${
            isRecording 
              ? 'bg-rose-950 border-rose-500/50 shadow-inner' 
              : audioBlob 
                ? 'bg-stone-950/60 border-emerald-500/30 hover:bg-stone-800' 
                : 'bg-stone-950/60 border-stone-800 hover:bg-stone-800'
          }`}
        >
          {isRecording ? (
             <>
               <Square className="w-6 h-6 text-rose-500 mb-1 fill-rose-500 animate-pulse" />
               <span className="text-[10px] font-bold text-rose-400">{formatDuration(recordingDuration)} - Stop</span>
             </>
          ) : audioBlob ? (
             <>
               <FileAudio className="w-6 h-6 text-emerald-400 mb-1" />
               <span className="text-[10px] font-bold text-emerald-500">Recorded • Tap to redo</span>
             </>
          ) : (
             <>
               <Mic className="w-6 h-6 text-stone-500 mb-1" />
               <span className="text-[10px] font-bold text-stone-400">Record Voice</span>
             </>
          )}
        </button>
      </div>

      <button
        type="button"
        disabled={(!photoFile && !audioBlob) || isSubmitting}
        onClick={handleSubmit}
        className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${
          (!photoFile && !audioBlob) || isSubmitting
            ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
            : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg'
        }`}
      >
        {isSubmitting ? (
          <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Processing...</>
        ) : (
          <><Upload className="w-4 h-4" /> Submit to HOD</>
        )}
      </button>

    </div>
  );
};
