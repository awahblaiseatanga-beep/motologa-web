import React from 'react';
import { AppointmentReservation, DeferredRepair } from '../types';

export interface AppointmentsScreenProps {
  garageId: string;
  departmentId?: string;
  departmentName?: string;
  mechanics: string[];
  deferredRepairs?: DeferredRepair[];
  onConvertAppointmentToJob: (appt: AppointmentReservation) => Promise<void>;
  onNavigateToFloor: () => void;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  garageId,
  departmentId,
  departmentName,
  mechanics,
  deferredRepairs,
  onConvertAppointmentToJob,
  onNavigateToFloor,
}) => {
  return (
    <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[300px] shadow-md">
      <h2 className="text-xl font-bold text-white mb-2">Bookings & Appointments</h2>
      <p className="text-stone-400 text-sm mb-6 text-center max-w-sm">
        This section is reserved for future integration with the MOTOLOGA appointment pipeline.
      </p>
      <button 
        onClick={onNavigateToFloor}
        className="px-6 py-2.5 rounded-xl bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 hover:text-white transition"
      >
        Return to Floor
      </button>
    </div>
  );
};
