import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchGarageMembers, fetchJobsForGarage } from '../lib/api';
import { GarageMember, Job } from '../types';
import { Clock, Check, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { InvoiceGenerator } from '../components/InvoiceGenerator';

interface CustomerOutboxScreenProps {
  garageId: string;
  departmentId?: string;
  userRole: 'owner' | 'hod';
}

export const CustomerOutboxScreen: React.FC<CustomerOutboxScreenProps> = ({
  garageId,
  departmentId,
  userRole
}) => {
  const [customerFindings, setCustomerFindings] = useState<any[]>([]);
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<any>({});
  
  // Invoice Modal State
  const [estimatingJob, setEstimatingJob] = useState<{ finding: any; matchedJobData: Job; customDescription?: string; customImage?: string } | null>(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const garageJobs = await fetchJobsForGarage(garageId);
      const jobIds = garageJobs.map(j => j.id);

      if (jobIds.length === 0) {
        setCustomerFindings([]);
        setDebugLog({ step: 'No jobs', garageJobs: garageJobs.length });
        return;
      }

      const { data: findingsData, error } = await supabase
        .from('additional_findings')
        .select('*')
        .in('parent_job_id', jobIds)
        .in('status', ['pending_approval', 'pending_customer']);

      if (error) {
        console.error('Supabase Rejection on Outbox Fetch:', error);
        setDebugLog({ step: 'Fetch Error', message: error.message });
        throw error;
      }

      const memberList = await fetchGarageMembers(garageId);
      const activeHodDepartments = new Set(
        memberList.filter((m: any) => m.role === 'hod' && m.department_id).map((m: any) => m.department_id)
      );

      const validFindings = (findingsData || [])
        .filter(f => {
          const matchedJob = garageJobs.find(j => j.id === f.parent_job_id);
          if (!matchedJob || !matchedJob.assigned_to) return false;
          
          const assignedMech = memberList.find((m: any) => m.user_id === matchedJob.assigned_to);
          const mechDept = assignedMech?.department_id;

          if (userRole === 'owner') {
            if (!mechDept) return true;
            return !activeHodDepartments.has(mechDept);
          } else if (userRole === 'hod') {
            return mechDept === departmentId;
          }
          return false;
        })
        .map(f => {
          const matchedJob = garageJobs.find(j => j.id === f.parent_job_id);
          return {
            ...f,
            jobs: {
              vehicle_make: matchedJob?.vehicleModel || 'Vehicle',
              vehicle_model: '',
              plate: matchedJob?.licensePlate || 'Unknown Plate',
              customer_phone: matchedJob?.customerPhone || '',
              status: matchedJob?.status === 'Paused' ? 'paused' : 'in_progress',
              estimate_notes: matchedJob?.estimateNotes || ''
            }
          };
        });

      // Hydrate local descriptions from database notes
      const initialDescriptions: Record<string, string> = {};
      validFindings.forEach(f => {
         if (f.jobs?.estimate_notes) {
           initialDescriptions[f.id] = f.jobs.estimate_notes;
         }
      });
      setLocalDescriptions(initialDescriptions);

      setCustomerFindings(validFindings);
      setDebugLog({
         totalJobs: garageJobs.length,
         rawFindings: findingsData?.length || 0,
         validFindings: validFindings.length,
         rawPendingApproval: findingsData?.filter(f => f.status === 'pending_approval').length,
         rawPendingCustomer: findingsData?.filter(f => f.status === 'pending_customer').length
      });
    } catch (err) {
      console.error('Error loading outbox:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [garageId, departmentId, userRole]);

  const handleSavePrice = async (findingId: string) => {
    const cost = localPrices[findingId];
    const parsedCost = parseFloat(cost || '0');

    if (isNaN(parsedCost) || parsedCost <= 0) {
      alert('Security Guard: Please enter a valid numerical price. Letters and generic values are blocked.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('additional_findings')
        .update({ estimated_cost: parsedCost })
        .eq('id', findingId);
        
      if (error) throw error;
      
      // Update local state without reloading
      setCustomerFindings(prev => prev.map(f => f.id === findingId ? { ...f, estimated_cost: parsedCost } : f));
    } catch (err: any) {
      alert(`Failed to save price: ${err.message}`);
    }
  };

  const handleSendToCustomer = async (finding: any) => {
    // Determine the matched job from loaded fetch cache
    const jobsRef = await fetchJobsForGarage(garageId);
    const matchedJob = jobsRef.find((j: Job) => j.id === finding.parent_job_id);
    if (!matchedJob) {
      alert("Error: Reference Job Not Found");
      return;
    }
    
    // Synthesize a structured proxy Job object pushing the specific Add-On finding into the description core
    const proxyJob: Job = {
      ...matchedJob,
      issueDescription: localDescriptions[finding.id]?.trim() || finding.component || finding.description || "Additional Findings / Overflows",
      laborFeeFcfa: finding.estimated_cost || 0,
      partsFeeFcfa: 0,
    };
    
    setEstimatingJob({ finding, matchedJobData: proxyJob, customDescription: localDescriptions[finding.id]?.trim(), customImage: finding.photo_url });
  };

  const handlePauseJobAndSend = async (finding: any) => {
    try {
      // 1. Pause the associated Job globally
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'paused' })
        .eq('id', finding.parent_job_id);
      
      if (jobError) throw jobError;

      // 2. Set finding to pending_customer
      const { error: findingError } = await supabase
        .from('additional_findings')
        .update({ status: 'pending_customer' })
        .eq('id', finding.id);
        
      if (findingError) throw findingError;
      
      const phone = finding.jobs.customer_phone;
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('237') ? cleanPhone : `237${cleanPhone}`;
        const shopName = garageId || 'Workshop';
        
        const text = `*CRITICAL ALERT* Hello! This is ${shopName}. We have temporarily PAUSED work on your ${finding.jobs.vehicle_make} (${finding.jobs.license_plate || finding.jobs.plate}) because our technicians discovered a critical issue. We need your authorization for an additional ${finding.estimated_cost} FCFA before we can safely proceed. Reply YES to approve this work and resume the repair.`;
        
        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
      }

      setCustomerFindings(prev => prev.map(f => f.id === finding.id ? { ...f, status: 'pending_customer' } : f));
    } catch (err: any) {
      alert(`Failed to pause job and route finding to customer: ${err.message}`);
    }
  };

  const handleCustomerApproved = async (finding: any) => {
    try {
      const { error } = await supabase
        .from('additional_findings')
        .update({ status: 'customer_approved' })
        .eq('id', finding.id);
        
      if (error) throw error;
      
      // Auto-Unpause parent job just in case it was paused!
      await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', finding.parent_job_id);
      
      setCustomerFindings(prev => prev.filter(f => f.id !== finding.id));
    } catch (err: any) {
      alert(`Failed to approve finding: ${err.message}`);
    }
  };
  
  const handleUnpauseJob = async (finding: any) => {
    try {
      const { error } = await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', finding.parent_job_id);
      if (error) throw error;
      
      alert(`Job Unpaused! Mechanics can resume work immediately.`);
      // Update local state so the lock button vanishes
      setCustomerFindings(prev => prev.map(f => {
         if (f.id === finding.id) {
           return { ...f, jobs: { ...f.jobs, status: 'in_progress' } };
         }
         return f;
      }));
    } catch (err: any) {
      alert(`Failed to unpause job: ${err.message}`);
    }
  };

  const handleRejectFinding = async (finding: any) => {
    try {
      const { error } = await supabase.from('additional_findings').update({ status: 'rejected' }).eq('id', finding.id);
      if (error) throw error;
      
      // Auto-Unpause parent job just in case it was paused!
      await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', finding.parent_job_id);
      
      setCustomerFindings(prev => prev.filter(f => f.id !== finding.id));
    } catch (err: any) {
      alert(`Failed to reject finding: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-stone-300 text-sm font-medium bg-stone-900 border border-stone-800 rounded-2xl animate-in fade-in h-96">
        <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mb-4" />
        <span className="animate-pulse tracking-widest uppercase font-black text-xs text-stone-400">Loading Outbox</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200 w-full">
      <div className="bg-sky-950/40 border border-sky-500/30 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-sky-500/10">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Clock className="w-5 h-5" />
            <h2 className="uppercase tracking-wider text-sm">Unified Approvals & Outbox ({customerFindings.length})</h2>
          </div>
          <button onClick={() => loadData(false)} className="p-2 bg-sky-900/30 text-sky-400 hover:text-sky-300 rounded-lg transition active:scale-95 text-xs font-bold flex items-center gap-1 border border-sky-500/30">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>

        {customerFindings.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-sky-900 opacity-50 mx-auto mb-3" />
            <h3 className="text-stone-300 font-bold mb-1">Queue Clear</h3>
            <p className="text-stone-500 text-xs text-balance">There are no pending approvals or customer authorizations right now.</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {customerFindings.map((finding) => (
              <div key={finding.id} className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl flex flex-col gap-3 shadow-md transition hover:border-stone-700">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-stone-200">
                     <span className="text-emerald-400">VEHICLE:</span> {finding.jobs?.vehicle_make || 'Vehicle'} {finding.jobs?.vehicle_model || ''}
                  </div>
                  {finding.status === 'pending_approval' ? (
                     <div className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                       PENDING
                     </div>
                  ) : (
                     <div className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300">
                       QUOTED / AWAITING
                     </div>
                  )}
                </div>
                
                <div className="text-xs font-mono text-stone-400">
                  Plate: {finding.jobs?.license_plate || finding.jobs?.plate || 'Unknown Plate'}
                </div>

                {finding.photo_url && (
                  <img src={finding.photo_url} alt="DVI" className="w-full h-32 object-cover border border-stone-700 rounded-lg shadow-inner" />
                )}

                {finding.worker_voice_note_url && (
                  <div className="bg-stone-800/80 rounded-lg p-2 border border-stone-700 w-full overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Voice Note</span>
                    <audio controls src={finding.worker_voice_note_url} className="w-full h-7" />
                  </div>
                )}
                
                {/* CONDITIONAL ACTION STATES */}
                {finding.status === 'pending_approval' && !finding.estimated_cost && (
                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-stone-800/80">
                    <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Set Price (FCFA)</label>
                       <input 
                         type="number"
                         value={localPrices[finding.id] || ''}
                         onChange={(e) => setLocalPrices(prev => ({ ...prev, [finding.id]: e.target.value }))}
                         className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                         placeholder="Ex. 45000"
                       />
                    </div>
                    <div className="flex gap-2 w-full mt-1">
                      <button onClick={() => handleSavePrice(finding.id)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider py-2 rounded-lg transition">
                        Save Addition
                      </button>
                      <button onClick={() => handleRejectFinding(finding)} className="px-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-600/50 text-[11px] font-black uppercase py-2 rounded-lg transition">
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {finding.status === 'pending_approval' && !!finding.estimated_cost && (
                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-stone-800/80">
                    <div className="text-sm font-black text-amber-400 my-1 bg-amber-950/20 px-3 py-2 border border-amber-500/10 rounded-lg">
                      Draft Price: {finding.estimated_cost} FCFA
                    </div>
                    
                    <div className="flex flex-col gap-1 my-2">
                       <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Estimate Description (Transcribe voice notes/findings here)</label>
                       <textarea
                         value={localDescriptions[finding.id] || ''}
                         onChange={(e) => setLocalDescriptions(prev => ({ ...prev, [finding.id]: e.target.value }))}
                         className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm font-sans text-white focus:outline-none focus:border-emerald-500 min-h-[60px]"
                         placeholder="Detailed breakdown of necessary repairs..."
                       />
                    </div>

                    <div className="flex gap-2 w-full mt-1">
                      <button disabled={!localDescriptions[finding.id]?.trim()} onClick={() => handleSendToCustomer(finding)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:text-stone-500 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow" title="Send Quote but Mechanic keeps working on other parts of the job">
                        <Send className="w-3.5 h-3.5" /> Quote (Continue)
                      </button>
                      <button onClick={() => handlePauseJobAndSend(finding)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow" title="Pause the ENTIRE job while waiting for customer response">
                        <AlertCircle className="w-3.5 h-3.5" /> Critical Pause
                      </button>
                    </div>
                  </div>
                )}

                {finding.status === 'pending_customer' && (
                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-stone-800/80">
                    <div className="text-sm font-black text-sky-400 my-1 bg-sky-950/20 px-3 py-2 border border-sky-500/10 rounded-lg flex items-center justify-between">
                      <span>Quoted:</span>
                      <span>{finding.estimated_cost} FCFA</span>
                    </div>
                    <button onClick={() => handleCustomerApproved(finding)} className="w-full bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black uppercase tracking-wider py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow">
                      <Check className="w-4 h-4" /> Mark Customer Approved
                    </button>
                    {finding.jobs?.status === 'paused' && (
                       <button onClick={() => handleUnpauseJob(finding)} className="w-full bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow mt-1">
                         <RefreshCw className="w-4 h-4 shrink-0" /> Unpause Job (Continue Work)
                       </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* ESTIMATE INVOICE MODAL BOUNDARY */}
      {estimatingJob && (
        <InvoiceGenerator
          job={estimatingJob.matchedJobData}
          garageName={garageId || 'Workshop'}
          documentType="ESTIMATE"
          customDescription={estimatingJob.customDescription}
          customImage={estimatingJob.customImage}
          onClose={() => setEstimatingJob(null)}
          onConfirmSave={async () => {
             // 1. Mark Database entry as officially Quoted/Awaiting & Persist Transcription
             const finding = estimatingJob.finding;
             try {
               await supabase.from('additional_findings').update({ status: 'pending_customer' }).eq('id', finding.id);
               await supabase.from('jobs').update({ estimate_notes: estimatingJob.customDescription }).eq('id', finding.parent_job_id);
               setCustomerFindings(prev => prev.map(f => f.id === finding.id ? { ...f, status: 'pending_customer' } : f));
             } catch (e) {
               console.error("Database finding status update exception:", e);
               throw e;
             }
          }}
          onConfirmPrint={async () => {
             // 2. Dispatch the WhatsApp protocol
             const phone = estimatingJob.matchedJobData.customerPhone || estimatingJob.finding?.jobs?.customer_phone;
             if (phone) {
               const cleanPhone = phone.replace(/\D/g, '');
               const fullPhone = cleanPhone.startsWith('237') ? cleanPhone : `237${cleanPhone}`;
               const text = `Hello, please review the attached estimate for your vehicle and reply 'APPROVED' so we can proceed.`;
               window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
             }
             
             setEstimatingJob(null);
          }}
        />
      )}
    </div>
  );
};
