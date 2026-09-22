import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Job, JobStatus } from '../types';
import { EliteInvoice } from '../components/invoices/EliteInvoice';
import { Printer, RefreshCw, AlertCircle } from 'lucide-react';

export const SharedDocumentPage = () => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [garageName, setGarageName] = useState('MOTOLOGA GARAGE');
  const [currencySymbol, setCurrencySymbol] = useState('FCFA');

  useEffect(() => {
    // Extract jobId from URL path. e.g. /shared/document/123-abc
    const parts = window.location.pathname.split('/');
    const jobId = parts[parts.length - 1];
    
    if (!jobId || jobId === 'document') {
      setError('Invalid Document Link - Missing ID');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_public_invoice', { req_job_id: jobId });
        if (rpcError) throw rpcError;
        if (!data) throw new Error('Document not found or access denied');
        
        // Map securely fetched data
        const dbJob = data.job || {};
        const customer = data.customer || {};
        const vehicle = data.vehicle || {};
        
        // Retrieve global shop settings safely
        const { data: settingsData } = await supabase
           .from('shop_settings')
           .select('shop_name, currency_symbol')
           .eq('id', 1)
           .single();
           
        if (settingsData) {
           if (settingsData.shop_name) setGarageName(settingsData.shop_name);
           if (settingsData.currency_symbol) setCurrencySymbol(settingsData.currency_symbol);
        }
        
        // Format for existing UI templates
        const uiJob: Job = {
           id: dbJob.id || jobId,
           licensePlate: vehicle.plate || dbJob.plate || '',
           customerPhone: customer.phone || dbJob.customer_phone || '',
           customerName: customer.name || dbJob.customer_name || 'Walk-in Client',
           vehicleModel: vehicle.model || vehicle.make ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : dbJob.vehicle_model || '',
           issueDescription: dbJob.description || dbJob.issue_description || '',
           estimateNotes: dbJob.estimate_notes || '',
           status: (dbJob.status === 'in_progress' ? 'In Repair' : (['pending_checkout', 'completed', 'ready'].includes(dbJob.status) ? 'Ready/Released' : 'Diagnosis')) as JobStatus,
           createdAt: new Date(dbJob.created_at || Date.now()).getTime(),
           partSource: 'Garage Stock',
           laborFeeFcfa: dbJob.labor_fee || 0,
           partsFeeFcfa: dbJob.parts_fee || 0,
           released: ['ready', 'completed'].includes(dbJob.status),
           mechanic: data.mechanic || { full_name: dbJob.assigned_to || 'Motologa Technician' },
        };
        
        setJob(uiJob);
      } catch (e: any) {
        console.error("Public Invoice Access Error:", e);
        setError(e.message || 'Error securely loading the digital document.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-stone-500 text-sm font-bold uppercase tracking-widest animate-pulse">Retrieving Secure Document...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Cannot Load Document</h2>
        <p className="text-slate-500 mt-2 max-w-sm text-center">{error}</p>
        <button 
           onClick={() => window.location.reload()}
           className="mt-6 text-sky-600 font-bold hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Estimate vs Invoice Logic
  // If labor fee is 0 or it's not checked out yet, it's mostly an estimate. But rely on the caller's context.
  const isEstimate = job.status !== 'Ready/Released' && job.status !== 'Work Done' && (!job.laborFeeFcfa || job.estimateNotes);
  const docType = isEstimate ? 'ESTIMATE' : 'INVOICE';

  return (
    <div className="min-h-screen bg-stone-200 flex flex-col items-center py-6 px-2 sm:px-4 font-sans print:bg-white print:py-0 print:px-0 scroll-smooth">
      <div className="w-full max-w-4xl flex justify-center sm:justify-end mb-6 print:hidden">
        <button 
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3.5 sm:py-3 rounded-2xl sm:rounded-xl flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(16,185,129,0.3)] border-2 border-emerald-400 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Printer className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">Download PDF / Print Document</span>
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white shadow-xl overflow-hidden print:shadow-none mb-12 border border-slate-200 sm:rounded-xl">
        <EliteInvoice 
           job={job} 
           garageName={garageName} 
           currencySymbol={currencySymbol}
           documentType={docType}
           customDescription={job.estimateNotes || job.issueDescription}
        />
      </div>
    </div>
  );
};
