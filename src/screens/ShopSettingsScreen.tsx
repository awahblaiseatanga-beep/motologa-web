import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, MessageSquare, Image as ImageIcon, Save, CheckCircle2, AlertTriangle, Settings, Users, PlusCircle } from 'lucide-react';
import { provisionDepartment, fetchDepartments } from '../lib/api';
import { Department } from '../types';

export const ShopSettingsScreen: React.FC<{ garageId: string }> = ({ garageId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  
  // Financial State
  const [standardLaborRate, setStandardLaborRate] = useState<number>(0);
  const [currencySymbol, setCurrencySymbol] = useState<string>('FCFA');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [inventoryMarkup, setInventoryMarkup] = useState<number>(10);
  
  // Logo State
  const [existingLogoUrl, setExistingLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Department State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptRole, setNewDeptRole] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // File input ref for visual manipulation
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    loadDepartments();
  }, [garageId]);

  const loadDepartments = async () => {
    if (!garageId) return;
    const depts = await fetchDepartments(garageId);
    setDepartments(depts);
  };

  const handleProvisionDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptRole.trim()) return;
    setDeptLoading(true);
    try {
      await provisionDepartment(garageId, newDeptName.trim(), newDeptRole.trim());
      setNewDeptName('');
      setNewDeptRole('');
      await loadDepartments();
      alert("Department created successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to provision department");
    } finally {
      setDeptLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('shop_name, shop_address, whatsapp_template, logo_url, standard_labor_rate, currency_symbol, low_stock_threshold, inventory_markup_percentage')
        .eq('id', 1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Fetch Settings Error:", error);
      }
      
      if (data) {
        setShopName(data.shop_name || '');
        setShopAddress(data.shop_address || '');
        setWhatsappTemplate(data.whatsapp_template || '');
        setExistingLogoUrl(data.logo_url || '');
        setStandardLaborRate(data.standard_labor_rate || 0);
        setCurrencySymbol(data.currency_symbol || 'FCFA');
        setLowStockThreshold(data.low_stock_threshold || 5);
        setInventoryMarkup(data.inventory_markup_percentage || 10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessToast(false);

    try {
      let finalLogoUrl = existingLogoUrl;

      // 1. Upload Logo if staged
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `shop_logo_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('garage-media')
          .upload(`settings/${fileName}`, logoFile, { contentType: logoFile.type });
          
        if (uploadError) {
          throw new Error(`Logo Upload Failed: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage
          .from('garage-media')
          .getPublicUrl(`settings/${fileName}`);
          
        finalLogoUrl = urlData.publicUrl;
      }

      // 2. Mega-Submit Database Update
      const { error: updateError } = await supabase
        .from('shop_settings')
        .update({
          shop_name: shopName,
          shop_address: shopAddress,
          whatsapp_template: whatsappTemplate,
          logo_url: finalLogoUrl,
          standard_labor_rate: standardLaborRate,
          currency_symbol: currencySymbol,
          low_stock_threshold: lowStockThreshold,
          inventory_markup_percentage: inventoryMarkup
        })
        .eq('id', 1);

      if (updateError) {
        throw new Error(updateError.message || "Failed to update settings");
      }

      // 3. Success state
      setExistingLogoUrl(finalLogoUrl);
      setLogoFile(null); // Clear staged file after successful upload
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 4000);

    } catch (err: any) {
      console.error("Mega-Submit Failed:", err);
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-stone-800 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <span className="text-stone-400 font-mono text-sm uppercase tracking-widest">Loading Settings...</span>
      </div>
    );
  }

  // Derive preview URL safely
  const activeLogoPreview = logoFile ? URL.createObjectURL(logoFile) : existingLogoUrl;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      {/* Settings Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-emerald-400" />
          Garage Identity & Settings
        </h1>
        <p className="text-stone-400 text-sm mt-2">
          Manage your workshop's global appearance and automated messaging templates.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-rose-300 block mb-1">Settings Sync Failed</span>
            <span className="text-rose-200/80">{errorMsg}</span>
          </div>
        </div>
      )}

      {successToast && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-emerald-400 block">Configuration Saved</span>
            <span className="text-emerald-200/80">Settings securely committed to database.</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Identity Block */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-stone-400" />
            Core Brand Identity
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Garage Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. MOTOLOGA Douala"
                  className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Physical Address
                </label>
                <textarea
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Street name, City, Region..."
                  rows={3}
                  className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-800/50">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Currency Symbol
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all appearance-none cursor-pointer"
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="R">R (ZAR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Standard Labor Rate
                  </label>
                  <input
                    type="number"
                    value={standardLaborRate}
                    onChange={(e) => setStandardLaborRate(Number(e.target.value))}
                    min="0"
                    step="100"
                    placeholder="e.g. 15000"
                    className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                Garage Logo (Receipts & Interface)
              </label>
              
              <div 
                className="flex-1 bg-stone-950/50 border border-stone-800 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-4 hover:bg-stone-900/80 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                  className="hidden"
                />
                
                {activeLogoPreview ? (
                  <div className="relative group/img">
                    <img 
                      src={activeLogoPreview} 
                      alt="Garage Logo" 
                      className="w-32 h-32 object-contain rounded-lg bg-stone-950 border border-stone-800 p-2"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-stone-600" />
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-400 group-hover:text-emerald-300">Tap to upload new logo</p>
                  <p className="text-xs text-stone-500 mt-1">Recommended: Square PNG, transparent background</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Department Management Block */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-400" />
            Manage Departments
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inline Creation Form */}
            <div>
              <p className="text-xs text-stone-400 mb-4 uppercase tracking-wider font-bold border-b border-stone-800/80 pb-2">
                Provision New Department
              </p>
              <form onSubmit={handleProvisionDepartment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Department Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Engine Repair"
                    className="w-full bg-stone-950/50 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Role / Function
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={newDeptRole}
                    onChange={(e) => setNewDeptRole(e.target.value)}
                    placeholder="e.g. Diagnostics"
                    className="w-full bg-stone-950/50 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={deptLoading}
                  className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold uppercase tracking-wider text-xs rounded-xl transition border border-emerald-500/30 flex items-center justify-center gap-2"
                >
                  {deptLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-300 rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Add Department
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Active Departments List */}
            <div>
              <p className="text-xs text-stone-400 mb-4 uppercase tracking-wider font-bold border-b border-stone-800/80 pb-2">
                Active Departments ({departments.length})
              </p>
              
              {departments.length === 0 ? (
                <div className="bg-stone-950/40 border border-stone-800 border-dashed rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">No departments listed</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {departments.map((dept) => (
                    <div key={dept.id} className="bg-[#142F30] border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center shadow-inner">
                      <div>
                        <p className="text-sm font-bold text-emerald-50">{dept.name}</p>
                        {dept.role && (
                          <p className="text-[10px] uppercase tracking-wider font-mono text-emerald-400/80 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                            {dept.role}
                          </p>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/50 flex items-center justify-center border border-emerald-500/20">
                        <Users className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Automation Block */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-stone-400" />
            Inventory Automation Strategies
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>Low-Stock Warning Boundary</span>
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                min="0"
                step="1"
                placeholder="e.g. 5"
                className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all font-mono"
              />
              <p className="text-xs text-stone-500 mt-2 font-medium leading-relaxed">
                Automatically trigger a bright red badge globally across the Inventory system if physical limits equal or fall below this count.
              </p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>Global Markup Premium (%)</span>
              </label>
              <input
                type="number"
                value={inventoryMarkup}
                onChange={(e) => setInventoryMarkup(Number(e.target.value))}
                min="0"
                step="5"
                placeholder="e.g. 15"
                className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all font-mono"
              />
              <p className="text-xs text-stone-500 mt-2 font-medium leading-relaxed">
                Applies a strict percentage multiplication factor natively calculating profit premiums over base physical stock costs instantly on mechanic checkouts.
              </p>
            </div>
          </div>
        </div>

        {/* Communications Block */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-stone-200 uppercase tracking-widest mb-6 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-stone-400" />
            Customer Communications
          </h2>

          <div>
             <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                WhatsApp Checkout Signature
              </label>
              <textarea
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                placeholder="Write the message that appears at the bottom of customer checkout receipts..."
                rows={5}
                className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-stone-900 transition-all resize-y font-mono"
              />
              <p className="text-xs text-stone-500 mt-3 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-stone-600 flex-shrink-0" />
                This message will automatically append to the bottom of all digital invoices sent to your customers when a job is marked paid. Use it for warranties, thank-yous, or operating hours.
              </p>
          </div>
        </div>

        {/* Global Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-black uppercase tracking-wider rounded-xl shadow-lg border border-emerald-400/50 flex items-center gap-2 transition-all"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-emerald-900/20 border-t-emerald-950 rounded-full animate-spin" />
                Syncing Settings...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 stroke-[2.5]" />
                Commit Native Overrides
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
