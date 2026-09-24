import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit3, Lock, RefreshCw } from 'lucide-react';
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
    }
  }, [isOpen, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setErrorMsg('Please select a valid target date.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'additional_finding') {
        if (!findingId || !departmentId) {
          throw new Error("Critical Schema Violation: Missing Finding ID or Department ID bindings.");
        }
        await promoteFindingToAppointment(
          findingId,
          departmentId,
          scheduledDate,
          scheduledTime,
          issueDescription || "Deferred maintenance/repair procedure."
        );
      } else if (mode === 'reschedule') {
         if (!appointmentId) {
            throw new Error("Critical Schema Violation: Missing Appointment ID for reschedule hook.");
         }
         // Dynamically override the API binding mapping natively to the update status payload
         const { updateAppointmentStatus } = await import('../lib/api');
         await updateAppointmentStatus(appointmentId, 'scheduled', {
           scheduled_date: scheduledDate,
           scheduled_time: scheduledTime || null,
           issue_description: issueDescription
         });
      } else if (mode === 'direct_booking') {
         const activeDeptId = userRole === 'owner' ? selectedDeptId : departmentId;
         if (!garageId || !activeDeptId) {
            throw new Error("Critical Schema Violation: Missing Garage ID or Department ID bindings.");
         }
         await createDirectAppointment(
            garageId,
            activeDeptId,
            directCustomerName,
            customerPhone,
            licensePlate,
            vehicleModel,
            scheduledDate,
            scheduledTime,
            issueDescription || "General service / diagnostic check.",
            'direct_booking'
         );
      } else if (mode === 'checkout') {
         // Note: For checkout mode, we expect Identity strings passed natively down from the Owner constraints.
         if (!garageId) {
            throw new Error("Critical Schema Violation: Missing Garage ID.");
         }
         
         const splitLabel = vehicleLabel.split(' - ');
         
         await createDirectAppointment(
            garageId,
            departmentId || '', // Passed gracefully into api wrapper where we can sanitize
            customerName,
            customerName, // proxy phone if none
            splitLabel.length > 1 ? splitLabel[1] : vehicleLabel,
            splitLabel[0] || vehicleLabel,
            scheduledDate,
            scheduledTime,
            issueDescription || "Deferred maintenance/repair procedure.",
            'checkout'
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Blurred overlay absolutely constrained */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={loading ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-stone-900 border border-stone-700/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
        
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

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
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

          {/* Dynamic Editor Properties */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-stone-500" /> Issue Context / Procedure Notes
            </label>
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
                 disabled={loading}
               />
             </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-3 pt-3">
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
