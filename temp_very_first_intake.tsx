import React, { useState } from 'react';
import { Camera, Check, Plus, Wrench, ShieldCheck, Phone, Car, Gauge, Image as ImageIcon } from 'lucide-react';
import { MECHANICS_LIST } from '../data/initialJobs';
import { Job, JobStatus } from '../types';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { MotologaLogo } from './MotologaLogo';
import { VoiceRecorderField } from './VoiceRecorderField';

interface IntakeScreenProps {
  onJobCreated: (newJob: Job) => void;
  onNavigateToQueue: () => void;
  availableMechanics?: string[];
}

const COMMON_VEHICLES = [
  'Toyota Hilux',
  'Toyota Corolla',
  'Toyota RAV4',
  'Mercedes 190D',
  'Peugeot 504',
  'Renault Duster',
  'Nissan Patrol',
  'Suzuki Grand Vitara',
];

export const IntakeScreen: React.FC<IntakeScreenProps> = ({
  onJobCreated,
  onNavigateToQueue,
  availableMechanics = MECHANICS_LIST,
}) => {
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [selectedMechanic, setSelectedMechanic] = useState<string>(availableMechanics[0] || 'Paul');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string>('');
  const [voiceNoteDuration, setVoiceNoteDuration] = useState<number>(0);

  // Photos
  const [dashboardPhoto, setDashboardPhoto] = useState<string>('');
  const [exteriorPhoto, setExteriorPhoto] = useState<string>('');
  const [activePhotoModal, setActivePhotoModal] = useState<'dashboard' | 'exterior' | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPlate = licensePlate.trim().toUpperCase();
    if (!trimmedPlate) {
      alert('Please enter a vehicle license plate');
      return;
    }

    const newJob: Job = {
      id: `job-${Date.now().toString().slice(-5)}`,
      licensePlate: trimmedPlate,
      customerPhone: customerPhone.startsWith('+237') ? customerPhone : `+237 ${customerPhone.trim()}`,
      vehicleModel: vehicleModel.trim() || 'Unspecified Vehicle',
      mechanicAssigned: selectedMechanic,
      status: (selectedMechanic === 'Unassigned' ? 'Diagnosis' : 'In Repair') as JobStatus,
      createdAt: Date.now(),
      timeElapsedMinutes: 0,
      dashboardPhotoUrl: dashboardPhoto,
      exteriorPhotoUrl: exteriorPhoto,
      oldPartPhotoUrl: '',
      newPartPhotoUrl: '',
      partSource: 'Garage Stock',
      laborFeeFcfa: 15000,
      issueDescription: issueDescription.trim() || 'General mechanical servicing',
      voiceNoteUrl: voiceNoteUrl || undefined,
      voiceNoteDurationSeconds: voiceNoteDuration || undefined,
      deferredRepair: {
        flagged: false,
        component: 'Brake Pads / Plaquettes de frein',
        timeframe: 'Next Month',
      },
      released: false,
    };

    onJobCreated(newJob);
    setToastMessage(`Vehicle ${trimmedPlate} logged & assigned to ${selectedMechanic}!`);

    // Reset inputs for next car
    setLicensePlate('');
    setCustomerPhone('');
    setVehicleModel('');
    setDashboardPhoto('');
    setExteriorPhoto('');
    setIssueDescription('');
    setVoiceNoteUrl('');
    setVoiceNoteDuration(0);

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-700 text-white p-4 rounded-xl shadow-lg border-2 border-emerald-400 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-200 shrink-0" />
            <p className="font-bold text-sm sm:text-base leading-snug">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToQueue}
            className="px-3 py-1.5 bg-white text-emerald-900 rounded-lg font-black text-xs uppercase tracking-wider shrink-0 hover:bg-emerald-100 active:scale-95"
          >
            View Queue
          </button>
        </div>
      )}

      {/* Main Intake Form Card */}
      <form onSubmit={handleDispatch} className="space-y-4">
        {/* Surface Card: Pure White (bg-white) with crisp, subtle borders (border-slate-200) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                New Vehicle Intake
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Douala & Yaoundé Garage Terminal • Offline Active
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#0E2829] border-l-4 border-[#34D399] flex items-center justify-center p-1 text-white shadow-xs shrink-0">
              <MotologaLogo variant="icon" size="sm" accentColor="#34D399" />
            </div>
          </div>

          {/* INPUT 1: License Plate (Direct Text Input) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="license-plate-input"
                className="text-xs font-black uppercase tracking-wider text-slate-700"
              >
                1. Vehicle License Plate
              </label>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-500">
                e.g. LT 7249 D, CE 8492 C
              </span>
            </div>

            <div className="relative">
              <input
                id="license-plate-input"
                type="text"
                placeholder="e.g. LT 7249 D or CE 8492 C"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono font-black text-base sm:text-lg tracking-wider px-3.5 py-3 rounded-xl border-2 border-slate-300 focus:border-[#34D399] focus:ring-2 focus:ring-emerald-400/20 focus:outline-none min-h-[48px] uppercase transition-all shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                required
              />
            </div>
          </div>

          {/* INPUT 2: Customer Phone Number (+237 prefix placeholder) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              2. Customer WhatsApp / Phone
            </label>
            <div className="flex items-center rounded-xl border-2 border-slate-300 bg-white overflow-hidden focus-within:border-emerald-600 transition-colors shadow-xs">
              <div className="bg-stone-200 px-3.5 py-3 text-slate-800 font-black font-mono text-base border-r border-slate-300 select-none flex items-center gap-1.5 min-h-[48px]">
                <span className="text-sm">🇨🇲</span>
                <span>+237</span>
              </div>
              <input
                id="customer-phone-input"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 699 45 12 88"
                className="flex-1 px-3 py-3 font-mono font-bold text-slate-900 text-lg focus:outline-none min-h-[48px] placeholder:text-slate-400 placeholder:font-normal"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Orange Money / MTN Mobile Money & WhatsApp ready
            </p>
          </div>

          {/* Vehicle Make & Model Helper */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Vehicle Model & Specification
            </label>
            <input
              id="vehicle-model-input"
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g. Toyota Hilux 4x4 or Peugeot Partner"
              className="w-full px-3.5 py-3 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-800 text-base focus:border-emerald-600 focus:outline-none min-h-[48px]"
            />
            {/* Quick common garage models in Cameroon */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_VEHICLES.slice(0, 4).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVehicleModel(m)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    vehicleModel === m
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                      : 'bg-stone-50 text-slate-600 border-slate-200 hover:bg-stone-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Issue or Servicing Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Reported Fault / Diagnostic Request
            </label>
            <textarea
              id="issue-description-input"
              rows={2}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="e.g. Engine knocking at 2000 RPM, clutch replacement, oil leak"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-slate-800 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Voice Recording Field (Directly under diagnostic request) */}
          <VoiceRecorderField
            audioUrl={voiceNoteUrl}
            durationSeconds={voiceNoteDuration}
            onAudioChange={(url, duration) => {
              setVoiceNoteUrl(url);
              setVoiceNoteDuration(duration);
            }}
          />

          {/* ACTION AREA: Two massive, prominent buttons for "Capture Dashboard Photo" and "Capture Exterior Photo" */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Inspection Evidence (Condition Logging)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Dashboard Button */}
              <button
                id="capture-dashboard-photo-btn"
                type="button"
                onClick={() => setActivePhotoModal('dashboard')}
                className={`relative min-h-[58px] p-3 rounded-xl border-2 flex items-center gap-3 transition-all active:scale-98 shadow-sm ${
                  dashboardPhoto
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                    : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    dashboardPhoto ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  {dashboardPhoto ? (
                    <img
                      src={dashboardPhoto}
                      alt="Dashboard preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Gauge className="w-6 h-6 stroke-[2]" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm sm:text-base leading-tight">
                      Capture Dashboard Photo
                    </span>
                    {dashboardPhoto && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-500 block leading-tight mt-0.5 line-clamp-2">
                    {dashboardPhoto ? 'Photo Attached (Tap to re-capture)' : 'Odometer, warning lights, fuel level'}
                  </span>
                </div>
                <Camera className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* Exterior Button */}
              <button
                id="capture-exterior-photo-btn"
                type="button"
                onClick={() => setActivePhotoModal('exterior')}
                className={`relative min-h-[58px] p-2.5 sm:p-3 rounded-xl border-2 flex items-center gap-2.5 sm:gap-3 transition-all active:scale-98 shadow-sm ${
                  exteriorPhoto
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                    : 'bg-stone-50 hover:bg-stone-100 border-slate-300 text-slate-800'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    exteriorPhoto ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400'
                  }`}
                >
                  {exteriorPhoto ? (
                    <img
                      src={exteriorPhoto}
                      alt="Exterior preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Car className="w-6 h-6 stroke-[2]" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm sm:text-base leading-tight">
                      Capture Exterior Photo
                    </span>
                    {exteriorPhoto && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-500 block leading-tight mt-0.5 line-clamp-2">
                    {exteriorPhoto ? 'Photo Attached (Tap to re-capture)' : 'Scratches, bumper, body pre-checks'}
                  </span>
                </div>
                <Camera className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* DISPATCH SECTION: Horizontal scrolling row of touch-friendly buttons for Mechanic Assignment */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-600" />
                Dispatch & Mechanic Assignment
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                Selected: <strong className="text-slate-900">{selectedMechanic}</strong>
              </span>
            </div>

            {/* Horizontal scrolling row of touch-friendly buttons (min 48px height) */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {availableMechanics.map((mech) => {
                const isSelected = selectedMechanic === mech;
                return (
                  <button
                    key={mech}
                    type="button"
                    onClick={() => setSelectedMechanic(mech)}
                    className={`min-h-[50px] min-w-[120px] px-4 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all border-2 shrink-0 select-none active:scale-95 shadow-sm ${
                      isSelected
                        ? 'bg-[#142F30] text-emerald-300 border-[#34D399] ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 hover:bg-stone-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isSelected ? 'bg-[#34D399]' : 'bg-slate-400'
                      }`}
                    ></span>
                    <span>{mech}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#34D399] ml-1 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRIMARY CTA: A full-width Deep Forest Teal button: "Log & Dispatch" */}
          <div className="pt-2">
            <button
              id="log-and-dispatch-btn"
              type="submit"
              className="w-full min-h-[54px] rounded-xl bg-[#0E2829] hover:bg-[#142F30] active:scale-[0.99] text-white font-black text-lg uppercase tracking-wider flex items-center justify-center gap-3 shadow-md border-2 border-emerald-500/40 cursor-pointer transition-all"
            >
              <Check className="w-6 h-6 text-[#34D399] stroke-[3]" />
              <span>Log & Dispatch</span>
            </button>
          </div>
        </div>
      </form>

      {/* Photo Capture Modal */}
      {activePhotoModal && (
        <PhotoCaptureModal
          isOpen={true}
          onClose={() => setActivePhotoModal(null)}
          title={
            activePhotoModal === 'dashboard'
              ? 'Capture Dashboard & Mileage'
              : 'Capture Exterior Vehicle Body'
          }
          category={activePhotoModal}
          currentPhotoUrl={activePhotoModal === 'dashboard' ? dashboardPhoto : exteriorPhoto}
          onPhotoCaptured={(url) => {
            if (activePhotoModal === 'dashboard') {
              setDashboardPhoto(url);
            } else {
              setExteriorPhoto(url);
            }
          }}
        />
      )}
    </div>
  );
};
