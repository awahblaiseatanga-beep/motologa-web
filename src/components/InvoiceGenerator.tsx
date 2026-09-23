import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useReactToPrint } from 'react-to-print';
import { Job } from '../types';
import { QuickFixReceipt } from './invoices/QuickFixReceipt';
import { EliteInvoiceV2 } from './invoices/EliteInvoiceV2';
import { X, Printer, Send } from 'lucide-react';

interface InvoiceGeneratorProps {
  job: Job;
  garageName: string;
  departmentName?: string;
  onClose: () => void;
  currencySymbol?: string;
  onConfirmPrint?: () => void;
  documentType?: 'INVOICE' | 'ESTIMATE';
  customDescription?: string;
  customImage?: string;
  onConfirmSave?: () => Promise<void>;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ 
  job, 
  garageName,
  departmentName,
  onClose,
  currencySymbol = 'FCFA',
  onConfirmPrint,
  documentType = 'INVOICE',
  customDescription,
  customImage,
  onConfirmSave
}) => {
  const [template, setTemplate] = useState<'quickfix' | 'elite'>('quickfix');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
       const { data } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
       if (data) setShopSettings(data);
    };
    fetchSettings();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `MOTOLOGA_Invoice_${job.id.substring(0, 8)}`,
    onAfterPrint: () => {
      // The print dialog opens externally. We no longer auto-trigger WA here 
      // since it's natively bound to the Step 2 'Send to Customer' button.
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0E2829] w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-emerald-900">
        
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-800 bg-[#0A1F1F] print:hidden">
          <h2 className="text-emerald-400 font-black tracking-wider uppercase text-lg">Generate Invoice</h2>
          <button onClick={onClose} className="text-emerald-500 hover:text-emerald-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Control Panel - Hidden on Print */}
        <div className="p-4 bg-[#142F30] border-b border-emerald-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
            <label className="text-emerald-300 font-bold text-sm tracking-wider uppercase text-center md:text-left">Style:</label>
            <div className="flex bg-[#0A1F1F] rounded-lg p-1 border border-emerald-800/50 w-full md:w-auto">
              <button
                onClick={() => setTemplate('quickfix')}
                className={`flex-1 md:flex-none py-1.5 px-3 md:px-4 rounded-md text-xs md:text-sm font-bold transition-all ${
                  template === 'quickfix' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-emerald-400 hover:bg-emerald-900/50'
                }`}
              >
                Quick Fix (POS)
              </button>
              <button
                onClick={() => setTemplate('elite')}
                className={`flex-1 md:flex-none py-1.5 px-3 md:px-4 rounded-md text-xs md:text-sm font-bold transition-all ${
                  template === 'elite' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-emerald-400 hover:bg-emerald-900/50'
                }`}
              >
                Elite (A4)
              </button>
            </div>
          </div>
          {!isSaved ? (
            <button 
              onClick={async () => {
                 try {
                   setIsSaving(true);
                   if (onConfirmSave) await onConfirmSave();
                   setIsSaved(true);
                   handlePrint();
                 } catch (e: any) {
                   console.error("Supabase Error:", e);
                   alert(e.message || "An error occurred while saving. Please try again.");
                 } finally {
                   setIsSaving(false);
                 }
              }}
              disabled={isSaving}
              className={`disabled:opacity-50 text-white font-black px-4 md:px-6 py-2.5 md:py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${documentType === 'ESTIMATE' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
            >
              <Printer className="w-5 h-5 flex-shrink-0" />
              <span>{isSaving ? "Saving..." : (documentType === 'ESTIMATE' ? "Save Estimate" : "Save Invoice (PDF)")}</span>
            </button>
          ) : (
            <button 
              onClick={() => {
                 if (onConfirmPrint) onConfirmPrint();
                 else onClose();
              }}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-900 font-black px-4 md:px-6 py-2.5 md:py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition animate-in zoom-in active:scale-95"
            >
              <Send className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Send to Customer (WhatsApp)</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-stone-200 p-8 flex justify-center items-start">
          {template === 'quickfix' ? (
            <QuickFixReceipt ref={componentRef} job={job} garageName={garageName} departmentName={departmentName} currencySymbol={currencySymbol} documentType={documentType} customDescription={customDescription} customImage={customImage} shopSettings={shopSettings} />
          ) : (
            <EliteInvoiceV2 ref={componentRef} job={job} garageName={garageName} departmentName={departmentName} currencySymbol={currencySymbol} documentType={documentType} customDescription={customDescription} customImage={customImage} shopSettings={shopSettings} />
          )}
        </div>
      </div>
    </div>
  );
};
