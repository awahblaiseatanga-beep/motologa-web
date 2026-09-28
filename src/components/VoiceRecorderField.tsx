import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Trash2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { formatAudioTime, createDiagnosticSampleAudio } from '../utils/audioUtils';
import { useTranslation } from 'react-i18next';

interface VoiceRecorderFieldProps {
  audioUrl: string;
  durationSeconds: number;
  onAudioChange: (url: string, duration: number) => void;
  label?: string;
  helperText?: string;
  promptTitle?: string;
  promptSubtitle?: string;
  buttonId?: string;
}

export const VoiceRecorderField: React.FC<VoiceRecorderFieldProps> = ({
  audioUrl,
  durationSeconds,
  onAudioChange,
  label,
  helperText,
  promptTitle,
  promptSubtitle,
  buttonId = 'record-voice-note-btn',
}) => {
  const { t } = useTranslation('common');
  const effectiveLabel = label || t('voiceRecorder.label');
  const effectivePromptTitle = promptTitle || t('voiceRecorder.promptTitle');
  const effectivePromptSubtitle = promptSubtitle || t('voiceRecorder.promptSubtitle');
  const effectiveHelperText = helperText || t('voiceRecorder.helper');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio & intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  // Set up audio listener when audioUrl changes
  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      return;
    }

    const audio = new Audio(audioUrl);
    audioElementRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onerror = null;
    };
  }, [audioUrl]);

  // Start recording
  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported on this browser or platform.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const finalDuration = recordingSecondsRef.current;

        // Convert to Base64 so it persists reliably in offline localStorage
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          onAudioChange(base64Data, Math.max(1, finalDuration));
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(250); // Slice every 250ms
      setIsRecording(true);

      // Start elapsed timer
      let secs = 0;
      recordingSecondsRef.current = 0;
      timerIntervalRef.current = window.setInterval(() => {
        secs += 1;
        recordingSecondsRef.current = secs;
        setRecordingSeconds(secs);

        // Auto-stop at 2 minutes (120s)
        if (secs >= 120) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      const isPermissionDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.includes('denied') ||
        err.message?.includes('dismissed');

      setErrorMessage(
        isPermissionDenied
          ? t('voiceRecorder.errorMessage.permissionDenied')
          : t('voiceRecorder.errorMessage.notSupported')
      );
      setIsRecording(false);
    }
  };

  const recordingSecondsRef = useRef<number>(0);

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Toggle playback
  const togglePlay = () => {
    if (!audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  // Delete current recording
  const handleDeleteAudio = () => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    onAudioChange('', 0);
  };

  // Attach realistic sample audio memo for testing or when mic is disabled
  const handleAttachDemoAudio = () => {
    const sample = createDiagnosticSampleAudio();
    onAudioChange(sample, 3);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-emerald-600" />
          <span>{effectiveLabel}</span>
        </label>
        {audioUrl && (
          <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {t('voiceRecorder.memoAttached')} ({formatAudioTime(durationSeconds)})
          </span>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 sm:p-3.5 transition-all">
        {/* Error message banner if microphone failed */}
        {errorMessage && (
          <div className="mb-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={handleAttachDemoAudio}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded border border-emerald-300 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-700" />
                {t('voiceRecorder.attachDemo')}
              </button>
            </div>
          </div>
        )}

        {/* State 1: Currently Recording */}
        {isRecording ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#142F30] text-white p-3 rounded-lg border-l-4 border-rose-500">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping absolute"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 relative"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                    {t('voiceRecorder.recordingLive')}
                  </span>
                  <span className="text-sm font-mono font-bold text-white bg-[#0E2829] px-2 py-0.5 rounded border border-rose-500/40">
                    {formatAudioTime(recordingSeconds)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {t('voiceRecorder.recordingSubtitle')}
                </p>
              </div>
            </div>

            {/* Sound bars animation */}
            <div className="flex items-center gap-1 h-5 px-2">
              <span className="w-1 bg-rose-400 rounded-full animate-pulse h-3"></span>
              <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-5"></span>
              <span className="w-1 bg-rose-400 rounded-full animate-pulse h-4"></span>
              <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-6"></span>
              <span className="w-1 bg-rose-400 rounded-full animate-pulse h-3"></span>
            </div>

            <button
              type="button"
              onClick={stopRecording}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <Square className="w-4 h-4 fill-white stroke-none" />
              <span>{t('voiceRecorder.stopAndAttach')}</span>
            </button>
          </div>
        ) : audioUrl ? (
          /* State 2: Audio Recorded & Ready */
          <div className="space-y-2.5">
            <div className="bg-[#142F30] border-l-4 border-[#34D399] p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
              {/* Play / Pause & Time */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-xl bg-[#34D399] hover:bg-emerald-300 text-[#0E2829] flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-xs cursor-pointer"
                  title={isPlaying ? t('voiceRecorder.pauseMemo') : t('voiceRecorder.playMemo')}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-black tracking-wide text-white uppercase">
                      {t('voiceRecorder.voiceMemoSaved')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-300 font-bold mt-0.5">
                    <span>{formatAudioTime(currentTime)}</span>
                    <span className="text-slate-400">/</span>
                    <span>{formatAudioTime(durationSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Waveform / Progress representation */}
              <div className="w-full sm:w-48 flex items-center gap-1 px-1">
                {[40, 70, 30, 85, 60, 95, 45, 80, 50, 90, 35, 75, 55, 65].map((val, idx) => {
                  const progressRatio = durationSeconds > 0 ? currentTime / durationSeconds : 0;
                  const barRatio = idx / 14;
                  const isPassed = barRatio <= progressRatio;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-full transition-all"
                      style={{
                        height: `${Math.max(6, (val / 100) * 22)}px`,
                        backgroundColor: isPassed ? '#34D399' : '#1E4748',
                      }}
                    />
                  );
                })}
              </div>

              {/* Action Buttons: Re-record / Delete */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={startRecording}
                  className="min-h-[40px] px-3 py-1.5 bg-[#0E2829] hover:bg-[#1E4748] text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer active:scale-95"
                  title={t('voiceRecorder.recordAgain')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('voiceRecorder.reRecord')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAudio}
                  className="min-h-[40px] px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-800/60 cursor-pointer active:scale-95"
                  title={t('voiceRecorder.remove')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="sr-only sm:not-sr-only">{t('delete')}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              {effectiveHelperText}
            </p>
          </div>
        ) : (
          /* State 3: Empty / Idle Prompt */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">
                  {effectivePromptTitle}
                </p>
                <p className="text-[11px] text-slate-500">
                  {effectivePromptSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id={buttonId}
                onClick={startRecording}
                className="w-full sm:w-auto min-h-[46px] px-4 py-2 rounded-xl bg-[#142F30] hover:bg-[#0E2829] active:scale-95 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#34D399] shadow-xs cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#34D399]" />
                <span>{t('voiceRecorder.recordBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleAttachDemoAudio}
                className="hidden xs:flex min-h-[46px] px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-slate-600 font-medium text-xs border border-slate-300 items-center justify-center cursor-pointer"
                title={t('voiceRecorder.demoToneTitle')}
              >
                {t('voiceRecorder.demoToneBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
