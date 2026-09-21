import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchDepartments, fetchCompletedInvoicesToday } from '../lib/api';
import { Department, Job } from '../types';
import { InvoiceGenerator } from '../components/InvoiceGenerator';
import { RefreshCw, PlayCircle, Clock, Calendar, CheckCircle, FileAudio, LayoutDashboard } from 'lucide-react';

interface OwnerDailyLogsScreenProps {
  garageId: string;
}

interface AudioLog {
  id: string;
  departmentName: string;
  created_at: string;
  audio_url: string;
}

export const OwnerDailyLogsScreen: React.FC<OwnerDailyLogsScreenProps> = ({ garageId }) => {
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [invoices, setInvoices] = useState<Job[]>([]);
  const [viewingInvoiceJob, setViewingInvoiceJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAudioLogs = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch available departments
      const depts = await fetchDepartments(garageId);
      
      let allLogs: AudioLog[] = [];

      // 2. Query Storage buckets sequentially tracking specific folder structures without needing SQL table entries
      await Promise.all(
        depts.map(async (dept) => {
          const folderPath = `hod-reports/${garageId}/${dept.id}`;
          const { data: files, error } = await supabase.storage
            .from('garage-media')
            .list(folderPath, {
              sortBy: { column: 'name', order: 'desc' },
            });

          if (error) {
            console.warn(`Failed to fetch logs for department ${dept.name}`, error);
            return;
          }

          if (files && files.length > 0) {
            // Standardize payloads
            for (const file of files) {
              if (file.name === '.emptyFolderPlaceholder' || file.name === '.DS_Store') continue;

              const filePath = `${folderPath}/${file.name}`;
              const { data: publicUrlData } = supabase.storage
                .from('garage-media')
                .getPublicUrl(filePath);

              allLogs.push({
                id: file.id || `${dept.id}-${file.name}`,
                departmentName: dept.name,
                created_at: file.created_at,
                audio_url: publicUrlData.publicUrl,
              });
            }
          }
        })
      );

      // Sort globally by descending time natively
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setLogs(allLogs);

      // 3. Fetch End of Day Generated Invoices separately without blocking main logs
      const dailyInvoices = await fetchCompletedInvoicesToday(garageId);
      setInvoices(dailyInvoices);
      
    } catch (err) {
      console.error('Error fetching HOD logs from storage block:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (garageId) {
      fetchAudioLogs();
    }
  }, [garageId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-4" />
        <span className="animate-pulse font-bold tracking-widest text-xs uppercase">Fetching End of Day Reports...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full gap-6 animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">End of Day HOD Logs</h1>
          </div>
          <p className="text-stone-400 text-xs sm:text-sm font-medium">
            Listen to daily audio summaries dispatched from your department leads natively.
          </p>
        </div>
        
        <button
          onClick={() => fetchAudioLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-bold text-sm transition-all border border-stone-700 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Summaries
        </button>
      </div>

      {/* Roster Layout block */}
      {logs.length === 0 ? (
        <div className="bg-stone-900/50 border border-stone-800/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <FileAudio className="w-16 h-16 text-stone-600 mb-4" />
          <h2 className="text-stone-300 font-black text-lg mb-2">No Reports Available</h2>
          <p className="text-stone-500 text-sm max-w-md text-balance">
            Your Heads of Department have not submitted any voice summaries to your dashboard yet. Once they finish their shifts and send reports, they will actively populate here natively.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {logs.map((log) => {
            const dateObj = new Date(log.created_at);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            
            return (
              <div 
                key={log.id} 
                className="bg-stone-900 border border-stone-800 hover:border-indigo-500/30 transition-all rounded-2xl p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden group"
              >
                {/* Backdrop styling glow strictly ornamental */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors"></div>
                
                <div className="flex items-start justify-between gap-3 relative z-10 border-b border-stone-800/60 pb-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className="px-2.5 py-1 bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 rounded-md font-black uppercase text-[10px] tracking-wider mb-1">
                      {log.departmentName}
                    </span>
                    <div className="flex items-center gap-1.5 text-stone-300 font-bold text-sm">
                      <Calendar className="w-4 h-4 text-stone-500" />
                      {dateStr}
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px] uppercase">
                      <Clock className="w-3.5 h-3.5" />
                      Received at {timeStr}
                    </div>
                  </div>
                  <div className="p-2 bg-stone-950 rounded-lg shadow-inner">
                    <FileAudio className="w-6 h-6 text-stone-400" />
                  </div>
                </div>

                {/* Media Audio Native Formatter */}
                <div className="relative z-10 bg-stone-950/80 rounded-xl border border-stone-800 p-2 inset-shadow">
                  <audio 
                    controls 
                    src={log.audio_url} 
                    className="w-full h-10 filter sepia hue-rotate-180 brightness-90 saturate-200 outline-none" 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TODAY'S GENERATED INVOICES SPLIT */}
      <div className="border-t-2 border-stone-800/80 mt-6 pt-8">
        <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Today's Generated Invoices
        </h2>
        
        {invoices.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center">
             <p className="text-stone-500 text-sm font-bold">No completed invoices documented today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {invoices.map((inv) => {
               const timeStr = new Date(inv.releasedAt || inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
               const totalAmount = (inv.laborFeeFcfa || 0) + (inv.partsFeeFcfa || 0);
               return (
                 <button 
                    key={inv.id} 
                    onClick={() => setViewingInvoiceJob(inv)}
                    className="bg-stone-900 border border-stone-800 hover:border-emerald-500/50 rounded-xl p-4 text-left shadow-sm transition-all flex flex-col justify-between h-[120px]"
                 >
                   <div>
                     <div className="flex justify-between items-start mb-1">
                       <span className="font-extrabold text-white truncate max-w-[150px]">{inv.vehicleModel || 'Walk-in'}</span>
                       <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider">{inv.licensePlate}</span>
                     </div>
                     <p className="text-xs text-stone-400 font-bold">Closed at {timeStr}</p>
                   </div>
                   <div className="flex justify-between items-end">
                     <span className="text-emerald-500 font-black text-lg font-mono">{totalAmount.toLocaleString()} FCFA</span>
                     <span className="text-[10px] text-stone-500 uppercase tracking-widest font-black">View</span>
                   </div>
                 </button>
               );
             })}
          </div>
        )}
      </div>

      {viewingInvoiceJob && (
         <InvoiceGenerator 
           job={viewingInvoiceJob}
           onClose={() => setViewingInvoiceJob(null)}
         />
      )}
    </div>
  );
};
