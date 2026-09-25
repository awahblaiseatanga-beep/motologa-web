import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw, Headphones } from 'lucide-react';
import { formatAudioTime } from '../utils/audioUtils';

interface VoiceNotePlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  label?: string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  durationSeconds = 0,
  label = 'Register Voice Memo',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(durationSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.onerror = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const effectiveDuration = totalDuration || durationSeconds || 1;
  const progressRatio = Math.min(1, Math.max(0, currentTime / effectiveDuration));

  return (
    <div className="bg-[#142F30] border-l-4 border-[#34D399] rounded-xl p-3 sm:p-3.5 text-white shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
          <Headphones className="w-4 h-4 text-[#34D399] shrink-0" />
          <span>{label}</span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono font-bold bg-[#0E2829] text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
          Audio Instructions
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Play / Pause button & timing */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-xl bg-[#34D399] hover:bg-emerald-300 text-[#0E2829] flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-xs cursor-pointer"
            title={isPlaying ? 'Pause Voice Memo' : 'Play Voice Memo'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="min-w-0">
            <span className="text-[11px] text-slate-300 block font-medium">
              {isPlaying ? 'Playing Diagnostic Audio...' : 'Tap Play to Listen'}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-300 font-black mt-0.5">
              <span>{formatAudioTime(currentTime)}</span>
              <span className="text-slate-500">/</span>
              <span>{formatAudioTime(effectiveDuration)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Waveform Visualization */}
        <div className="w-full sm:flex-1 sm:max-w-[200px] flex items-center gap-1 px-1 h-6">
          {[45, 80, 35, 95, 60, 100, 50, 85, 40, 90, 30, 75, 55, 65].map((val, idx) => {
            const barRatio = idx / 13;
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

        {/* Restart Button */}
        <button
          type="button"
          onClick={handleRestart}
          className="min-h-[40px] px-3 py-1.5 bg-[#0E2829] hover:bg-[#1E4748] text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer active:scale-95 shrink-0"
          title="Replay from beginning"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay</span>
        </button>
      </div>
    </div>
  );
};
