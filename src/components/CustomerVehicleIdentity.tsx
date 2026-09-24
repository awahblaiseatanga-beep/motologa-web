import React from 'react';
import { Phone, Users } from 'lucide-react';

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

export interface CustomerVehicleIdentityProps {
  licensePlate: string;
  setLicensePlate: (s: string) => void;
  customerPhone: string;
  setCustomerPhone: (s: string) => void;
  customerName: string;
  setCustomerName: (s: string) => void;
  vehicleModel: string;
  setVehicleModel: (s: string) => void;
}

export const CustomerVehicleIdentity: React.FC<CustomerVehicleIdentityProps> = ({
  licensePlate, setLicensePlate,
  customerPhone, setCustomerPhone,
  customerName, setCustomerName,
  vehicleModel, setVehicleModel
}) => {
  return (
    <div className="space-y-4">
      {/* INPUT 1: License Plate (Direct Text Input) */}
      <div className="space-y-1.5">
        <label
          htmlFor="identity-license-plate"
          className="text-xs font-black uppercase tracking-wider text-slate-700"
        >
          Vehicle License Plate
        </label>
        <input
          id="identity-license-plate"
          type="text"
          placeholder="e.g. LT 7249 D or CE 8492 C"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
          className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono font-black text-base sm:text-lg tracking-wider px-3.5 py-3 rounded-xl border-2 border-slate-300 focus:border-[#34D399] focus:ring-2 focus:ring-emerald-400/20 focus:outline-none min-h-[48px] uppercase transition-all shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
          maxLength={15}
          required
        />
      </div>

      {/* INPUT 2: Customer Phone Number */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-slate-500" />
          Customer WhatsApp / Phone
        </label>
        <div className="flex items-center rounded-xl border-2 border-slate-300 bg-white overflow-hidden focus-within:border-emerald-600 transition-colors shadow-xs">
          <div className="bg-stone-200 px-3.5 py-3 text-slate-800 font-black font-mono text-base border-r border-slate-300 select-none flex items-center gap-1.5 min-h-[48px]">
            <span className="text-sm">🇨🇲</span>
            <span>+237</span>
          </div>
          <input
            id="identity-customer-phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 699451288"
            maxLength={20}
            className="flex-1 px-3 py-3 font-mono font-bold text-slate-900 text-lg focus:outline-none min-h-[48px] placeholder:text-slate-400 placeholder:font-normal"
            required
          />
        </div>
      </div>

      {/* INPUT 3: Customer Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          Customer Name
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Jean Dupont"
          maxLength={50}
          className="w-full px-3.5 py-3 rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-800 text-base focus:border-emerald-600 focus:outline-none min-h-[48px]"
        />
      </div>

      {/* Vehicle Make & Model Helper */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Vehicle Model & Specification
        </label>
        <input
          id="identity-vehicle-model"
          type="text"
          value={vehicleModel}
          onChange={(e) => setVehicleModel(e.target.value)}
          placeholder="e.g. Toyota Hilux 4x4 or Peugeot Partner"
          maxLength={50}
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
    </div>
  );
};
