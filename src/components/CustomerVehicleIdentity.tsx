import React, { useState, useEffect, useRef } from 'react';
import { Phone, Users, Check, X, Search, Car } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchCustomers, searchVehicles } from '../lib/api';

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
  
  customerId?: string | null;
  setCustomerId?: (id: string | null) => void;
  vehicleId?: string | null;
  setVehicleId?: (id: string | null) => void;
}

export const CustomerVehicleIdentity: React.FC<CustomerVehicleIdentityProps> = ({
  licensePlate, setLicensePlate,
  customerPhone, setCustomerPhone,
  customerName, setCustomerName,
  vehicleModel, setVehicleModel,
  customerId, setCustomerId,
  vehicleId, setVehicleId
}) => {
  const { t } = useTranslation('owner');
  
  // Autocomplete States
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<any[]>([]);
  
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  
  const [showCustomerOpts, setShowCustomerOpts] = useState(false);
  const [showVehicleOpts, setShowVehicleOpts] = useState(false);
  
  const customerDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const vehicleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Avoid re-triggering search immediately after selecting
  const blockCustomerSearchRef = useRef(false);
  const blockVehicleSearchRef = useRef(false);

  // --- Customer Search Logic ---
  useEffect(() => {
    if (blockCustomerSearchRef.current) {
      blockCustomerSearchRef.current = false;
      return;
    }
    
    // Clear stale ID if user keeps typing after selecting
    if (customerId && setCustomerId) {
       setCustomerId(null); 
    }

    if (customerPhone.trim().length < 4) {
      setCustomerOptions([]);
      setShowCustomerOpts(false);
      return;
    }

    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    
    setIsSearchingCustomer(true);
    customerDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCustomers(customerPhone);
        setCustomerOptions(results);
        setShowCustomerOpts(true);
      } catch (err) {
        console.error('Customer lookup failed', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 600); // 600ms debounce
    
    return () => clearTimeout(customerDebounceRef.current);
  }, [customerPhone]);

  // --- Vehicle Search Logic ---
  useEffect(() => {
    if (blockVehicleSearchRef.current) {
      blockVehicleSearchRef.current = false;
      return;
    }
    
    // Clear stale ID if user keeps typing after selecting
    if (vehicleId && setVehicleId) {
       setVehicleId(null); 
    }

    if (licensePlate.trim().length < 2) {
      setVehicleOptions([]);
      setShowVehicleOpts(false);
      return;
    }

    if (vehicleDebounceRef.current) clearTimeout(vehicleDebounceRef.current);
    
    setIsSearchingVehicle(true);
    vehicleDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchVehicles(licensePlate, customerId || undefined);
        setVehicleOptions(results);
        setShowVehicleOpts(true);
      } catch (err) {
        console.error('Vehicle lookup failed', err);
      } finally {
        setIsSearchingVehicle(false);
      }
    }, 600);
    
    return () => clearTimeout(vehicleDebounceRef.current);
  }, [licensePlate, customerId]);

  const selectCustomer = (c: any) => {
    blockCustomerSearchRef.current = true;
    let cleanPhone = c.phone || '';
    if (cleanPhone.startsWith('+237')) cleanPhone = cleanPhone.replace('+237', '').trim();
    if (cleanPhone.startsWith('237')) cleanPhone = cleanPhone.slice(3).trim();
    
    setCustomerPhone(cleanPhone);
    setCustomerName(c.name || '');
    if (setCustomerId) setCustomerId(c.id);
    
    setShowCustomerOpts(false);
  };

  const selectVehicle = (v: any) => {
    blockVehicleSearchRef.current = true;
    setLicensePlate(v.plate || '');
    setVehicleModel(v.model || v.make || '');
    if (setVehicleId) setVehicleId(v.id);
    
    setShowVehicleOpts(false);
  };

  return (
    <div className="space-y-4">
      {/* INPUT 1: License Plate (WITH AUTOCOMPLETE) */}
      <div className="space-y-1.5 relative">
        <label
          htmlFor="identity-license-plate"
          className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between"
        >
          <span>{t('vehicleLicensePlate', '1. Vehicle License Plate')}</span>
          {vehicleId && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Check className="w-3 h-3"/> Existing Linked</span>}
        </label>
        
        <div className="relative">
          <input
            id="identity-license-plate"
            type="text"
            placeholder={t('licensePlateExample', 'e.g. LT 7249 D or CE 8492 C')}
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            onFocus={() => { if(vehicleOptions.length > 0) setShowVehicleOpts(true); }}
            className={`w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono font-black text-base sm:text-lg tracking-wider px-3.5 py-3 rounded-xl border-2 transition-all shadow-2xs placeholder:text-slate-400 placeholder:font-normal min-h-[48px] uppercase ${vehicleId ? 'border-[#34D399] bg-emerald-50/30' : 'border-slate-300 focus:border-[#34D399] focus:ring-2 focus:ring-emerald-400/20'} focus:outline-none`}
            maxLength={15}
            required
          />
          {isSearchingVehicle && (
             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                 <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin"></div>
             </div>
          )}
          
          {/* VEHICLE DROPDOWN RESULTS */}
          {showVehicleOpts && licensePlate.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden z-[60] max-h-56 overflow-y-auto flex flex-col pt-1">
               {vehicleOptions.length > 0 ? (
                 vehicleOptions.map(v => (
                   <button
                     key={v.id}
                     type="button"
                     onClick={() => selectVehicle(v)}
                     className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center justify-between group active:scale-98 transition-all"
                   >
                      <div>
                        <div className="font-mono font-bold text-stone-900 text-sm">{v.plate}</div>
                        <div className="text-[11px] font-medium text-stone-500">{v.model || v.make || 'No model specified'}</div>
                      </div>
                      <Car className="w-4 h-4 text-stone-300 group-hover:text-[#34D399] transition-colors" />
                   </button>
                 ))
               ) : (
                 <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                   <div className="text-sm font-bold text-stone-700">No match found</div>
                   <div className="text-[11px] text-stone-500 font-medium leading-snug mt-0.5 pointer-events-none">Submitting will register this implicitly as a <strong className="text-emerald-700">New Vehicle</strong>.</div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* INPUT 2: Customer Phone Number (WITH AUTOCOMPLETE) */}
      <div className="space-y-1.5 relative">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
             <Phone className="w-3.5 h-3.5 text-slate-500" />
             {t('customerWhatsAppPhone', '2. Customer Phone')}
          </div>
          {customerId && <span className="text-[10px] text-emerald-600 font-black bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Check className="w-3 h-3"/> Returning</span>}
        </label>
        
        <div className="flex items-center rounded-xl border-2 border-slate-300 bg-white overflow-visible transition-colors shadow-xs relative">
          <div className="bg-stone-200 px-3.5 py-3 text-slate-800 font-black font-mono text-base border-r border-slate-300 select-none flex items-center gap-1.5 min-h-[48px] rounded-l-xl z-10">
            <span className="text-sm">🇨🇲</span>
            <span>+237</span>
          </div>
          <input
            id="identity-customer-phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
            onFocus={() => { if(customerOptions.length > 0) setShowCustomerOpts(true); }}
            placeholder={t('phoneExample', '699 45 12 88')}
            maxLength={20}
            className={`flex-1 px-3 py-3 font-mono font-bold text-slate-900 text-lg focus:outline-none min-h-[48px] rounded-r-xl placeholder:text-slate-400 placeholder:font-normal ${customerId ? 'bg-emerald-50/30' : ''}`}
            required
          />
          {isSearchingCustomer && (
             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
                 <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin"></div>
             </div>
          )}
        </div>
        
        {/* CUSTOMER DROPDOWN RESULTS */}
        {showCustomerOpts && customerPhone.trim().length >= 4 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden z-[70] max-h-56 overflow-y-auto flex flex-col pt-1">
             {customerOptions.length > 0 ? (
               customerOptions.map(c => (
                 <button
                   key={c.id}
                   type="button"
                   onClick={() => selectCustomer(c)}
                   className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center justify-between group active:scale-98 transition-all"
                 >
                    <div>
                      <div className="font-bold text-stone-900 text-sm">{c.name || 'Unnamed Client'}</div>
                      <div className="text-[11px] font-mono font-bold text-stone-500">{c.phone}</div>
                    </div>
                    <Users className="w-4 h-4 text-stone-300 group-hover:text-[#34D399] transition-colors" />
                 </button>
               ))
             ) : (
                 <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                   <div className="text-sm font-bold text-stone-700">No match found</div>
                   <div className="text-[11px] text-stone-500 font-medium leading-snug mt-0.5 pointer-events-none">Submitting will register this implicitly as a <strong className="text-emerald-700">New Customer</strong>.</div>
                 </div>
             )}
          </div>
        )}
      </div>

      {/* INPUT 3: Customer Name */}
      <div className="space-y-1.5 pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          {t('customerName', '3. Customer Name')}
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t('customerNameExample', 'e.g. Jean Dupont')}
          maxLength={50}
          className={`w-full px-3.5 py-3 rounded-xl border-2 bg-white font-semibold text-slate-800 text-base focus:outline-none min-h-[48px] ${customerId ? 'border-[#34D399] bg-emerald-50/20' : 'border-slate-300 focus:border-emerald-600'}`}
        />
      </div>

      {/* Vehicle Make & Model Helper */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          {t('vehicleModelAndSpec', 'Vehicle Model & Specification')}
        </label>
        <input
          id="identity-vehicle-model"
          type="text"
          value={vehicleModel}
          onChange={(e) => setVehicleModel(e.target.value)}
          placeholder={t('vehicleModelExample', 'e.g. Toyota Hilux 4x4')}
          maxLength={50}
          className={`w-full px-3.5 py-3 rounded-xl border-2 bg-white font-semibold text-slate-800 text-base focus:outline-none min-h-[48px] ${vehicleId ? 'border-[#34D399] bg-emerald-50/20' : 'border-slate-300 focus:border-emerald-600'}`}
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
      
      {/* Background overlay when dropdowns are visible to capture absolute outside clicks on mobile */}
      {(showCustomerOpts || showVehicleOpts) && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => { setShowCustomerOpts(false); setShowVehicleOpts(false); }}
        />
      )}
    </div>
  );
};
