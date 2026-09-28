import React, { useState } from 'react';
import { Wrench, Calendar, MessageCircle, CheckCircle2, Clock, Plus, X } from 'lucide-react';
import { DeferredRepair, DeferredStatus } from '../types';
import {
  generateWhatsAppReminderUrl,
  COMPONENT_OPTIONS,
  TIMEFRAME_OPTIONS,
  sanitizeCameroonPhone,
} from '../types';
import { useTranslation } from 'react-i18next';

interface RecallDashboardProps {
  repairs: DeferredRepair[];
  onUpdateRepairs?: (updated: DeferredRepair[]) => void;
  className?: string;
}

export const RecallDashboard: React.FC<RecallDashboardProps> = ({
  repairs,
  onUpdateRepairs,
  className = '',
}) => {
  const { t } = useTranslation('owner');
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted'>('pending');
  const [justSentId, setJustSentId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  // Quick add state
  const [newPlate, setNewPlate] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newComponent, setNewComponent] = useState<string>(COMPONENT_OPTIONS[0]);
  const [newTimeframe, setNewTimeframe] = useState<string>(TIMEFRAME_OPTIONS[0]);

  const pendingCount = repairs.filter((r) => r.status === 'pending').length;
  const contactedCount = repairs.filter((r) => r.status === 'contacted').length;

  const filteredRepairs = repairs.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'contacted') return r.status === 'contacted';
    return true;
  });

  const handleSendReminder = (repair: DeferredRepair) => {
    // Generate WhatsApp deep link
    const waUrl = generateWhatsAppReminderUrl(
      repair.customerPhone,
      repair.componentToFix,
      repair.vehiclePlate
    );

    // Open WhatsApp
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    const updated = repairs.map(r => r.id === repair.id ? { ...r, status: 'contacted' as DeferredStatus } : r);
    if (onUpdateRepairs) {
      onUpdateRepairs(updated);
    }

    setJustSentId(repair.id);
    setTimeout(() => {
      setJustSentId(null);
    }, 4000);
  };

  const handleToggleStatus = (repair: DeferredRepair) => {
    const nextStatus: DeferredStatus = repair.status === 'pending' ? 'contacted' : 'pending';
    const updated = repairs.map(r => r.id === repair.id ? { ...r, status: nextStatus } : r);
    if (onUpdateRepairs) {
      onUpdateRepairs(updated);
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim() || !newPhone.trim()) return;

    const created: DeferredRepair = {
      id: `def-${Date.now()}`,
      status: 'pending' as DeferredStatus,
      vehiclePlate: newPlate.toUpperCase().trim(),
      customerPhone: sanitizeCameroonPhone(newPhone),
      componentToFix: newComponent,
      targetDateString: newTimeframe,
    };

    if (onUpdateRepairs) {
      onUpdateRepairs([created, ...repairs]);
    }

    setNewPlate('');
    setNewPhone('');
    setShowQuickAdd(false);
  };

  return (
    <section
      id="recall-dashboard-section"
      aria-label={t('followUpsDueFeedAria', 'Owner Follow-Ups Due Feed')}
      className={`w-full max-w-md mx-auto space-y-3.5 ${className}`}
    >
      {/* Header Banner */}
      <div className="bg-[#0E2829] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#173D3E]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-[#34D399] flex items-center justify-center">
              <Calendar className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                {t('followUpsDueTitle', 'Follow-Ups Due')}
                {pendingCount > 0 && (
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    {pendingCount} {t('dueBadge', 'Due')}
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-300 font-medium">
                {t('preventiveRemindersDesc', 'Preventive maintenance reminders for Cameroonian clients')}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="quick-add-followup-btn"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            aria-label={t('addFollowUpAria', 'Add Follow-Up')}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-[#34D399] font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-500/30 cursor-pointer"
          >
            {showQuickAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showQuickAdd ? t('closeBtn') : t('addBtn')}</span>
          </button>
        </div>

        {/* Filter Pills (Ergonomic Touch Targets) */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-emerald-900/60">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 border ${
              filter === 'pending'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                : 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60 hover:bg-emerald-900/50'
            }`}
          >
            <span>{t('pendingStatusFilter', 'Pending')}</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('contacted')}
            className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 border ${
              filter === 'contacted'
                ? 'bg-[#34D399] text-[#0E2829] border-emerald-300 shadow-xs'
                : 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60 hover:bg-emerald-900/50'
            }`}
          >
            <span>{t('sentStatusFilter', 'Sent')}</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
              {contactedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 border ${
              filter === 'all'
                ? 'bg-white text-slate-900 border-white shadow-xs'
                : 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60 hover:bg-emerald-900/50'
            }`}
          >
            <span>{t('allStatusFilter', 'All')}</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
              {repairs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Add Follow-Up Form */}
      {showQuickAdd && (
        <form
          onSubmit={handleQuickAddSubmit}
          className="bg-white rounded-2xl border-2 border-emerald-600 p-4 shadow-sm space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">
              {t('logNewFollowUp', 'Log New Follow-Up')}
            </h4>
            <span className="text-xs font-bold text-emerald-700 font-mono">{t('cameroonSuffix', '+237 Cameroon')}</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t('vehicleLicensePlateLabel', 'Vehicle License Plate')}</label>
            <input
              type="text"
              required
              placeholder={t('licensePlateEg', 'e.g. LT 7249 D')}
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
              className="w-full min-h-[48px] px-3.5 bg-stone-50 text-slate-900 font-mono font-black text-base rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t('customerPhoneCameroon', 'Customer Phone (+237)')}</label>
            <input
              type="tel"
              required
              placeholder="699 45 12 88"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full min-h-[48px] px-3.5 bg-stone-50 text-slate-900 font-mono font-bold text-base rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">{t('componentLabel', 'Component')}</label>
              <select
                value={newComponent}
                onChange={(e) => setNewComponent(e.target.value)}
                className="w-full min-h-[48px] px-2.5 bg-stone-50 text-slate-900 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {COMPONENT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">{t('timeframeLabel', 'Timeframe')}</label>
              <select
                value={newTimeframe}
                onChange={(e) => setNewTimeframe(e.target.value)}
                className="w-full min-h-[48px] px-2.5 bg-stone-50 text-slate-900 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
              >
                {TIMEFRAME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] h-12 bg-[#0E2829] hover:bg-[#143c3d] text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#34D399]" />
            <span>{t('saveFollowUpBtn', 'Save Follow-Up')}</span>
          </button>
        </form>
      )}

      {/* List of Cards */}
      {filteredRepairs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h4 className="text-base font-black text-slate-800">
            {filter === 'pending'
              ? t('allFollowUpsSent', 'All Follow-Ups Sent!')
              : t('noDeferredRepairs', 'No deferred repair entries in this view.')}
          </h4>
          <p className="text-xs text-slate-700 max-w-xs mx-auto">
            {t('flagRepairsDesc', 'Flag repairs during checkout to schedule automated WhatsApp customer recalls.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRepairs.map((repair) => {
            const isContacted = repair.status === 'contacted';
            const wasJustSent = justSentId === repair.id;

            return (
              <article
                key={repair.id}
                id={`followup-card-${repair.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 transition-all hover:border-slate-300"
              >
                {/* Top Row: Plate Badge with Green Left Border & Timeframe */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* License Plate Badge with Green Left Border */}
                  <div className="flex items-center">
                    <div
                      className="bg-stone-900 text-amber-300 font-mono font-black text-base sm:text-lg tracking-wider px-3.5 py-1.5 rounded-xl border-2 border-stone-800 border-l-4 border-l-[#10B981] shadow-2xs flex items-center gap-2 select-all"
                      title={`Vehicle License Plate: ${repair.vehiclePlate}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span>{repair.vehiclePlate}</span>
                    </div>
                  </div>

                  {/* Status & Timeframe Pill */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(repair)}
                      title={t('clickToggleStatusAria', 'Click to toggle status')}
                      className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 border transition-colors cursor-pointer ${
                        isContacted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      {isContacted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t('contactedBadge', 'Contacted')}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('dueBadge', 'Due')}</span>
                        </>
                      )}
                    </button>

                    <div className="min-h-[36px] px-2.5 py-1 rounded-lg bg-stone-100 text-slate-700 font-black text-xs flex items-center gap-1 border border-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{repair.targetDateString}</span>
                    </div>
                  </div>
                </div>

                {/* Middle Info: Component & Customer Phone */}
                <div className="space-y-1 bg-stone-50/80 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t('deferredServiceLabel', 'Deferred Service:')}
                    </span>
                    <strong className="text-base sm:text-lg font-black text-slate-900">
                      {repair.componentToFix}
                    </strong>
                  </div>

                  <div className="text-xs font-mono font-bold text-slate-700 flex items-center gap-2 pl-6">
                    <span>{t('clientPrefix', 'Client:')} +237 {sanitizeCameroonPhone(repair.customerPhone)}</span>
                  </div>
                </div>

                {/* Just sent confirmation feedback */}
                {wasJustSent && (
                  <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{t('whatsappOpenedConfirm', 'WhatsApp opened! Status updated to Contacted.')}</span>
                  </div>
                )}

                {/* THE ACTION: Full-Width WhatsApp Green Button (h-12 / min-h-[48px], text-lg) */}
                <button
                  type="button"
                  id={`send-whatsapp-btn-${repair.id}`}
                  onClick={() => handleSendReminder(repair)}
                  className="w-full min-h-[48px] h-12 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1da851] text-white font-black text-base sm:text-lg tracking-tight flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-white stroke-none" />
                  <span>{t('sendWhatsappReminderBtn', 'Send WhatsApp Reminder')}</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
