import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Wrench, Calendar, ChevronDown, Check } from 'lucide-react';
import { COMPONENT_OPTIONS, TIMEFRAME_OPTIONS } from '../types';

export interface DeferredRepairSelection {
  enabled: boolean;
  component: string;
  timeframe: string;
}

interface DeferredRepairToggleProps {
  initialEnabled?: boolean;
  initialComponent?: string;
  initialTimeframe?: string;
  onChange: (data: DeferredRepairSelection) => void;
  className?: string;
}

export const DeferredRepairToggle: React.FC<DeferredRepairToggleProps> = ({
  initialEnabled = false,
  initialComponent = COMPONENT_OPTIONS[0],
  initialTimeframe = TIMEFRAME_OPTIONS[0],
  onChange,
  className = '',
}) => {
  const { t } = useTranslation('owner');
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [component, setComponent] = useState<string>(initialComponent);
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);

  // Synchronize when initial props change (e.g. user selects a different car)
  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  useEffect(() => {
    if (initialComponent) setComponent(initialComponent);
  }, [initialComponent]);

  useEffect(() => {
    if (initialTimeframe) setTimeframe(initialTimeframe);
  }, [initialTimeframe]);

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    onChange({
      enabled: nextState,
      component,
      timeframe,
    });
  };

  const handleComponentChange = (val: string) => {
    setComponent(val);
    onChange({
      enabled,
      component: val,
      timeframe,
    });
  };

  const handleTimeframeChange = (val: string) => {
    setTimeframe(val);
    onChange({
      enabled,
      component,
      timeframe: val,
    });
  };

  return (
    <div
      className={`w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 transition-all ${className}`}
    >
      {/* Header & Large Touch Toggle (h-12 / min-h-[48px]) */}
      <button
        type="button"
        id="deferred-repair-main-toggle"
        onClick={handleToggle}
        aria-pressed={enabled}
        className={`w-full min-h-[48px] h-14 px-4 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer select-none border-2 ${
          enabled
            ? 'bg-[#0E2829] text-white border-[#0E2829] shadow-md'
            : 'bg-stone-50 hover:bg-stone-100 text-slate-900 border-slate-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              enabled
                ? 'bg-emerald-500/20 text-[#34D399]'
                : 'bg-stone-200 text-slate-700'
            }`}
          >
            <Wrench className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight leading-tight">
              {t("flagFutureRepairTitle")}
            </div>
            <div
              className={`text-xs font-medium leading-none mt-0.5 ${
                enabled ? 'text-emerald-200/90' : 'text-slate-700'
              }`}
            >
              {t("addOwnerFollowupDesc")}
            </div>
          </div>
        </div>

        {/* Tactile Checkbox Pill (48px ergonomic touch target) */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border-2 ${
            enabled
              ? 'bg-[#34D399] border-[#34D399] text-[#0E2829]'
              : 'bg-white border-slate-400 text-transparent'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      </button>

      {/* Revealed Form Controls when Flag is ON */}
      {enabled && (
        <div className="pt-2 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Select Component */}
          <div className="space-y-1.5">
            <label
              htmlFor="deferred-repair-component-select"
              className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t("componentFutureServiceLabel")}</span>
            </label>
            <div className="relative">
              <select
                id="deferred-repair-component-select"
                value={component}
                onChange={(e) => handleComponentChange(e.target.value)}
                className="w-full min-h-[48px] h-12 pl-4 pr-11 bg-stone-50 hover:bg-stone-100/80 focus:bg-white text-slate-900 text-base sm:text-lg font-bold rounded-xl border-2 border-slate-300 focus:border-[#0E2829] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none appearance-none cursor-pointer transition-all"
              >
                {COMPONENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="text-base text-slate-900 font-semibold py-1">
                    {opt}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Select Timeframe */}
          <div className="space-y-1.5">
            <label
              htmlFor="deferred-repair-timeframe-select"
              className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t("targetFollowupTimeframeLabel")}</span>
            </label>
            <div className="relative">
              <select
                id="deferred-repair-timeframe-select"
                value={timeframe}
                onChange={(e) => handleTimeframeChange(e.target.value)}
                className="w-full min-h-[48px] h-12 pl-4 pr-11 bg-stone-50 hover:bg-stone-100/80 focus:bg-white text-slate-900 text-base sm:text-lg font-bold rounded-xl border-2 border-slate-300 focus:border-[#0E2829] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none appearance-none cursor-pointer transition-all"
              >
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <option key={tf} value={tf} className="text-base text-slate-900 font-semibold py-1">
                    {tf}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Sun-Readable Summary Note */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-snug">
              {t("deferredSchedulePrefix")}{' '}
              <strong className="font-extrabold text-emerald-900">{component}</strong> due in{' '}
              <strong className="font-extrabold text-emerald-900">{timeframe}</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
