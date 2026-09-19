import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types';
import { Box, Plus, Search, Edit2, AlertCircle, X, Check, Save, Camera, Image as ImageIcon } from 'lucide-react';

interface InventoryScreenProps {
  garageId: string;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ garageId }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    part_name: '',
    registration_date: new Date().toISOString().split('T')[0],
    quantity_in_stock: 0,
    minimum_stock_level: 5,
    buying_price: 0,
    selling_price: 0,
    image_file: null as File | null,
    imagePreview: ''
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [garageId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error: pbError } = await supabase
        .from('inventory_items')
        .select('id, garage_id, part_name, category, part_number, quantity_in_stock, minimum_stock_level, buying_price, selling_price, image_url, created_at')
        .eq('garage_id', garageId)
        .order('part_name');

      if (pbError) throw pbError;
      setItems(data || []);
      
      const { data: configData } = await supabase.from('shop_settings').select('low_stock_threshold').eq('id', 1).single();
      if (configData) setLowStockThreshold(configData.low_stock_threshold || 5);

    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      part_name: '',
      registration_date: new Date().toISOString().split('T')[0],
      quantity_in_stock: 1,
      minimum_stock_level: 5,
      buying_price: 0,
      selling_price: 0,
      image_file: null,
      imagePreview: ''
    });
    setSaveSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      part_name: item.part_name,
      registration_date: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      quantity_in_stock: item.quantity_in_stock,
      minimum_stock_level: item.minimum_stock_level,
      buying_price: item.buying_price,
      selling_price: item.selling_price,
      image_file: null,
      imagePreview: item.image_url || ''
    });
    setSaveSuccess(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let finalImageUrl = editingItem?.image_url || null;

      if (formData.image_file) {
        const fileExt = formData.image_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('garage-media')
          .upload(`inventory/${fileName}`, formData.image_file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('garage-media')
          .getPublicUrl(`inventory/${fileName}`);
        
        finalImageUrl = publicUrl;
      }

      const payload = {
        garage_id: garageId,
        part_name: formData.part_name,
        quantity_in_stock: Number(formData.quantity_in_stock),
        minimum_stock_level: Number(formData.minimum_stock_level),
        buying_price: Number(formData.buying_price),
        selling_price: Number(formData.selling_price),
        image_url: finalImageUrl,
        created_at: new Date(formData.registration_date).toISOString()
      };

      if (editingItem) {
        // Update
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        fetchInventory();
      }, 1000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save part definition.');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(t => 
    t.part_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-[#34D399]" />
            Inventory Logistics
          </h2>
          <p className="text-sm text-stone-400 max-w-xl mt-1">
            Track garage stock, automate critical thresholds, and monitor catalog profit margins.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input 
              type="text"
              placeholder="Search parts by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-stone-600 shadow-inner"
            />
          </div>
          <button 
            onClick={openNewModal}
            className="px-4 py-2.5 bg-[#34D399] hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-sm transition flex items-center gap-2 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Part</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto mb-4" />
            <div className="text-stone-500 font-mono text-sm">Synchronizing inventory schema...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 rounded-3xl bg-stone-800/50 border border-stone-700/50 flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-stone-500 opacity-60" />
            </div>
            <h3 className="text-stone-200 font-bold mb-1">No Parts Found</h3>
            <p className="text-stone-500 text-sm max-w-sm mx-auto mb-6">
              Your inventory database is currently empty. Start registering parts and fluids to track consumption.
            </p>
            <button onClick={openNewModal} className="text-[#34D399] font-bold text-sm hover:underline">
              Register First Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider text-[10px] font-mono border-b border-stone-800">
                <tr>
                  <th className="py-4 px-5">Photo</th>
                  <th className="py-4 px-5">Part Designation</th>
                  <th className="py-4 px-5 text-center">Stock Level</th>
                  <th className="py-4 px-5 text-right">Unit Buy</th>
                  <th className="py-4 px-5 text-right">Unit Sell</th>
                  <th className="py-4 px-5 text-right">Delta (Margin)</th>
                  <th className="py-4 px-5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50 text-stone-300">
                {filteredItems.map(item => {
                  const margin = item.selling_price - item.buying_price;
                  const isLowStock = item.quantity_in_stock < item.minimum_stock_level;
                  
                  return (
                    <tr key={item.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-5">
                        {item.image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-700 bg-stone-900 object-cover isolate">
                            <img src={item.image_url} alt={item.part_name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-stone-500" />
                          </div>
                        )}
                        {(item.quantity_in_stock <= lowStockThreshold) && (
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-1 sm:mt-0 shadow-sm animate-pulse">
                            <AlertCircle className="w-3 h-3 stroke-[3]" />
                            LOW STOCK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-bold text-white text-sm">{item.part_name}</div>
                        <div className="text-[10px] flex gap-2 text-stone-500 font-mono mt-0.5">
                           {item.created_at && <span>Registered: {new Date(item.created_at).toLocaleDateString()}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-[11px] ${
                          isLowStock ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.quantity_in_stock}
                          {isLowStock && <AlertCircle className="w-3 h-3" />}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-stone-400">
                        {item.buying_price.toLocaleString()} F
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-white">
                        {item.selling_price.toLocaleString()} F
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${margin > 0 ? 'text-[#34D399] bg-[#34D399]/10' : margin < 0 ? 'text-rose-400 bg-rose-500/10' : 'text-stone-500 bg-stone-800'}`}>
                           {margin > 0 ? '+' : ''}{margin.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)} />
          
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-screen">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/50">
              <h3 className="font-black text-white flex items-center gap-2">
                {editingItem ? <Edit2 className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                {editingItem ? 'Edit Component Definition' : 'Register New Part'}
              </h3>
              <button onClick={() => !saving && setIsModalOpen(false)} className="text-stone-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto w-full">
              {error && (
                <div className="mb-4 bg-rose-900/30 text-rose-300 border border-rose-500/30 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <form id="inventory-form" onSubmit={handleSave} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Part Image / Verification</label>
                  <input
                    type="file" accept="image/*" capture="environment"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setFormData({...formData, image_file: file, imagePreview: URL.createObjectURL(file)});
                      }
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#0E2829] file:text-emerald-400 hover:file:bg-[#153a3b] cursor-pointer"
                  />
                  {formData.imagePreview && (
                    <img src={formData.imagePreview} alt="Preview" className="h-16 w-16 object-cover mt-2 rounded-xl border border-stone-700 shadow-md block" />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Part Name *</label>
                  <input required
                    type="text" placeholder="e.g., Brake Pads (Front)" 
                    value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Registration Date</label>
                  <input required
                    type="date"
                    value={formData.registration_date} onChange={e => setFormData({...formData, registration_date: e.target.value})}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" 
                  />
                  <p className="text-[10px] text-stone-500 mt-0.5">The exact date this product was registered into inventory.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-800/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Pro Number</label>
                    <input required min="0" step="1"
                      type="number" 
                      value={formData.quantity_in_stock} onChange={e => setFormData({...formData, quantity_in_stock: Number(e.target.value)})}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500"/> Minimum Threshold Limit</label>
                    <input required min="0" step="1"
                      type="number" 
                      value={formData.minimum_stock_level} onChange={e => setFormData({...formData, minimum_stock_level: Number(e.target.value)})}
                      className="w-full bg-stone-950 border border-rose-500/30 rounded-xl px-3 py-2 text-sm text-amber-100 font-mono focus:outline-none focus:border-rose-500" 
                    />
                    <p className="text-[9px] text-stone-500 leading-tight">Sends notification alarm when stock reaches this limit.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-800/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Unit Buying Price (FCFA)</label>
                    <input required min="0"
                      type="number" 
                      value={formData.buying_price} onChange={e => setFormData({...formData, buying_price: Number(e.target.value)})}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-300 font-mono focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider text-emerald-400 drop-shadow">Unit Selling Price</label>
                    <input required min="0"
                      type="number" 
                      value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: Number(e.target.value)})}
                      className="w-full bg-stone-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-100 font-mono focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-stone-400 hover:text-white font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button 
                form="inventory-form"
                type="submit"
                disabled={saving || saveSuccess}
                className={`px-5 py-2 font-black rounded-xl text-sm transition flex items-center gap-2 ${
                  saveSuccess ? 'bg-emerald-500 text-stone-950' : 'bg-[#34D399] hover:bg-emerald-400 text-stone-950 shadow-lg shadow-emerald-500/10'
                }`}
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-stone-950/20 border-t-stone-950 rounded-full animate-spin"/> Saving...</>
                ) : saveSuccess ? (
                  <><Check className="w-4 h-4" /> Committed</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Record</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
