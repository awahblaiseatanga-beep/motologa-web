import React, { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, Car, Wrench, ShieldCheck, Clock } from 'lucide-react';
import { Appointment, Department } from '../types';
import { fetchAppointments, updateAppointmentStatus, convertAppointmentToJob } from '../lib/api';
import { ScheduleAppointmentModal } from '../components/ScheduleAppointmentModal';
import { supabase } from '../lib/supabase';

export interface AppointmentsScreenProps {
  garageId: string;
  departmentId?: string;
  departmentName?: string;
  userRole?: 'hod' | 'owner';
  departments?: Department[];
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  garageId,
  departmentId,
  departmentName,
  userRole = 'hod',
  departments = [],
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'direct_booking' | 'reschedule'>('direct_booking');
  const [activeRescheduleId, setActiveRescheduleId] = useState<string | undefined>(undefined);
  const [activeRescheduleDesc, setActiveRescheduleDesc] = useState<string>('');
  const [selectedFilterDept, setSelectedFilterDept] = useState<string>('ALL');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Identity Map
  const [customerMap, setCustomerMap] = useState<Record<string, any>>({});
  const [vehicleMap, setVehicleMap] = useState<Record<string, any>>({});
  const [findingMap, setFindingMap] = useState<Record<string, any>>({});

  const loadAppointments = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      if (!garageId) return;
      const data = await fetchAppointments(garageId, departmentId);
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [garageId, departmentId, userRole]);

  const visibleAppointments = appointments.filter(a => {
     if (userRole === 'owner' && selectedFilterDept !== 'ALL') {
        return a.department_id === selectedFilterDept;
     }
     return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-5 rounded-2xl">
         <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
               <Calendar className="w-6 h-6 text-sky-400" />
               Appointments
            </h2>
            <p className="text-sm font-medium text-stone-400 mt-1">
               {departmentName ? `${departmentName} Operational Queue` : 'Global Garage Schedule'}
            </p>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {userRole === 'owner' && departments.length > 0 && (
               <select 
                 value={selectedFilterDept} 
                 onChange={e => setSelectedFilterDept(e.target.value)}
                 className="w-full sm:w-auto px-4 py-3 bg-stone-950 border border-stone-800 text-stone-200 font-bold rounded-xl outline-none focus:border-sky-500 transition-colors"
               >
                 <option value="ALL">All Departments</option>
                 {departments.map(d => (
                   <option key={d.id} value={d.id}>{d.name}</option>
                 ))}
               </select>
            )}
            <button
            onClick={() => {
              setModalMode('direct_booking');
              setActiveRescheduleId(undefined);
              setActiveRescheduleDesc('');
              setModalOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-sky-600 hover:bg-sky-500 active:scale-95 transition-all text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
         >
            <Plus className="w-5 h-5" />
            New Appointment
         </button>
         </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-stone-900/50 border border-stone-800 rounded-2xl">
           <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mb-4" />
           <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Loading Schedule...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-stone-900/50 border border-stone-800 rounded-2xl text-center">
           <ShieldCheck className="w-12 h-12 text-stone-700 mb-4" />
           <h3 className="text-stone-300 font-bold text-lg">No Upcoming Appointments</h3>
           <p className="text-stone-500 text-sm mt-1">Your schedule is currently clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {visibleAppointments.map(appt => {
              const cust = (appt as any).customers;
              const veh = (appt as any).vehicles;
              const deptObj = (appt as any).departments;
              const globalDeptBadge = userRole === 'owner' && deptObj ? deptObj.name : null;
              const sourceLbl = appt.source === 'additional_finding' ? 'Sourced from Active Job' 
                              : appt.source === 'checkout' ? 'Deferred at Checkout' 
                              : 'Direct Booking';
              const isToday = appt.scheduled_date === new Date().toISOString().split('T')[0];
              
              return (
                <div key={appt.id} className={`bg-stone-900 border ${isToday ? 'border-sky-500/50' : 'border-stone-800'} rounded-2xl p-5 shadow-md flex flex-col`}>
                   <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-3">
                      <div className="flex items-center gap-2">
                         <div className={`p-1.5 rounded-lg ${isToday ? 'bg-sky-500 text-white' : 'bg-stone-800 text-stone-400'}`}>
                            <Calendar className="w-4 h-4" />
                         </div>
                         <span className={`font-black text-sm uppercase tracking-wider ${isToday ? 'text-sky-400' : 'text-stone-300'}`}>
                            {isToday ? 'TODAY' : appt.scheduled_date}
                         </span>
                         {globalDeptBadge && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-stone-950 text-stone-500 border border-stone-800 px-2 py-0.5 rounded-md">
                               {globalDeptBadge}
                            </span>
                         )}
                      </div>
                      {appt.scheduled_time && (
                         <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-stone-400 text-xs font-bold font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {appt.scheduled_time.slice(0, 5)}
                         </div>
                      )}
                   </div>

                   <div className="flex-1 space-y-3">
                      <div>
                         <p className="text-[10px] uppercase font-black tracking-widest text-stone-500 mb-0.5">Assigned Vehicle</p>
                         <p className="text-stone-200 font-bold flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-stone-400" />
                            {veh ? `${veh.plate} • ${veh.model}` : 'Unknown Vehicle'}
                         </p>
                      </div>
                      
                      <div>
                         <p className="text-[10px] uppercase font-black tracking-widest text-stone-500 mb-0.5">Attached Client</p>
                         <p className="text-stone-300 font-medium text-sm">
                            {cust ? `${cust.name || cust.full_name || 'Unknown'} (${cust.phone})` : 'Unknown Client'}
                         </p>
                      </div>

                      <div className="bg-stone-950 p-3 rounded-xl border border-stone-800/80">
                         <p className="text-[10px] uppercase font-black tracking-widest text-amber-500 mb-2 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Issue Context
                         </p>
                         {(() => {
                             const legacyRegex = /\[Voice Note: (.*?)\]/g;
                             let desc = appt.issue_description || '';
                             let extractedUrl = appt.voice_note_url || null;
                             
                             const match = legacyRegex.exec(desc);
                             if (match) {
                                 extractedUrl = extractedUrl || match[1];
                                 desc = desc.replace(match[0], '').trim();
                             }

                             return (
                               <div className="flex flex-col gap-2">
                                   {desc && <p className="text-stone-400 text-xs leading-relaxed whitespace-pre-wrap">{desc}</p>}
                                   {extractedUrl && (
                                      <div className={`${desc ? 'pt-2 border-t border-stone-800/60 mt-1' : ''}`}>
                                         <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Wrench className="w-3 h-3" /> Voice Memo attached
                                         </p>
                                         <audio controls src={extractedUrl} className="w-full h-8 shadow-sm rounded max-w-[90%] [&::-webkit-media-controls-panel]:bg-stone-800 [&::-webkit-media-controls-current-time-display]:text-stone-300 [&::-webkit-media-controls-time-remaining-display]:text-stone-300" />
                                      </div>
                                   )}
                                   {!desc && !extractedUrl && (
                                      <p className="text-stone-600 text-xs italic">No narrative context provided.</p>
                                   )}
                               </div>
                             );
                         })()}
                      </div>
                   </div>

                   <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500 bg-stone-950 px-2 py-1 rounded">
                        {sourceLbl}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {appt.status === 'scheduled' && (
                           <>
                             <button
                               onClick={async () => {
                                 const confirmed = window.confirm('Mark this customer as No-Show?');
                                 if (!confirmed) return;
                                 try { await updateAppointmentStatus(appt.id, 'no_show'); loadAppointments(true); } catch(e){}
                               }}
                               className="text-[10px] font-black uppercase text-stone-400 hover:text-white px-2 py-1 rounded transition-colors"
                             >
                               No-Show
                             </button>
                             <button
                               onClick={async () => {
                                 const confirmed = window.confirm('Cancel this appointment definitively?');
                                 if (!confirmed) return;
                                 try { await updateAppointmentStatus(appt.id, 'cancelled'); loadAppointments(true); } catch(e){}
                               }}
                               className="text-[10px] font-black uppercase text-stone-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={() => {
                                  setActiveRescheduleId(appt.id);
                                  setActiveRescheduleDesc(appt.issue_description);
                                  setModalMode('reschedule');
                                  setModalOpen(true);
                               }}
                               className="text-xs font-black uppercase text-white bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                             >
                               Reschedule
                             </button>
                             {isToday && (
                               <button 
                                 onClick={async () => {
                                    try { await updateAppointmentStatus(appt.id, 'checked_in'); loadAppointments(true); } catch(e){}
                                 }}
                                 className="text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                               >
                                  Check In
                               </button>
                             )}
                           </>
                        )}

                        {appt.status === 'checked_in' && (
                           <button 
                             disabled={convertingId === appt.id}
                             onClick={async () => {
                                try {
                                  setConvertingId(appt.id);
                                  await convertAppointmentToJob(appt.id);
                                  loadAppointments(true);
                                } catch(e: any) {
                                  alert(e.message || 'Failed to convert to job');
                                } finally {
                                  setConvertingId(null);
                                }
                             }}
                             className="text-xs font-black uppercase text-white bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg active:scale-95 transition-all shadow shadow-amber-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                              {convertingId === appt.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                              Convert to Job
                           </button>
                        )}

                        {(appt.status === 'converted_to_job' || appt.status === 'cancelled' || appt.status === 'no_show') && (
                           <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-2 py-1 bg-stone-900/50 rounded-md border border-stone-800">
                             {appt.status.replace(/_/g, ' ')}
                           </span>
                        )}
                      </div>
                   </div>
                </div>
              );
           })}
        </div>
      )}

      {/* Shared Modal binding */}
      <ScheduleAppointmentModal 
         isOpen={modalOpen}
         onClose={() => setModalOpen(false)}
         mode={modalMode}
         garageId={garageId}
         departmentId={departmentId}
         userRole={userRole}
         departments={departments}
         appointmentId={activeRescheduleId}
         initialDescription={activeRescheduleDesc}
         onSchedulingSuccess={() => {
            setModalOpen(false);
            loadAppointments(false);
         }}
      />
    </div>
  );
};
