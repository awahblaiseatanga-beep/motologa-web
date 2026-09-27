import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { domainEmitter, DOMAIN_EVENTS } from '../lib/invalidationEmitter';

export interface AppNotification {
  id: string;
  garage_id: string;
  recipient_user_id: string;
  actor_user_id?: string;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  metadata?: any;
  created_at: string;
  read_at: string | null;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
  garageId?: string;
  userId?: string;
}> = ({ children, garageId, userId }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const lostConnectionRef = useRef(false);
  const activeChannelRef = useRef<any>(null);

  // Load Initial History
  const loadNotifications = async () => {
    if (!garageId || !userId || fatalError) return;
    
    try {
      const { data, error, status } = await supabase
        .from('notifications')
        .select('*')
        .eq('garage_id', garageId)
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // If the table literally does not exist (42P01 Postgres code, mapped via Rest to 404 or 400)
        if (status === 404 || error.code === '42P01' || error.message.includes('relation "public.notifications" does not exist')) {
          setFatalError('NOTIFICATIONS_TABLE_MISSING');
          console.error("DIAGNOSTIC ALARM [NOTIFICATIONS_TABLE_MISSING]: The 'public.notifications' table does not exist in the connected Supabase project. A migration is missing or the schema cache is stale. Future fetch attempts are blocked to prevent request storms.");
        } else {
          console.error("REST GET Error:", error);
        }
      } else if (data) {
        setNotifications(data as AppNotification[]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [garageId, userId]);

  // Handle Lifecycles
  useEffect(() => {
    if (!garageId || !userId) return;

    // Strict Cleanup for React StrictMode
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }

    const channel = supabase.channel(`garage_${garageId}`);

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `garage_id=eq.${garageId}` },
      (payload) => {
        const newNotif = payload.new as AppNotification;
        if (newNotif.recipient_user_id === userId) {
          setNotifications(prev => [newNotif, ...prev]);
          setToast(newNotif);
          setTimeout(() => setToast(null), 4000);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `garage_id=eq.${garageId}` },
      (payload) => {
        domainEmitter.emit(DOMAIN_EVENTS.REFETCH_JOBS);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments', filter: `garage_id=eq.${garageId}` },
      (payload) => {
        domainEmitter.emit(DOMAIN_EVENTS.REFETCH_APPOINTMENTS);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'garage_members', filter: `garage_id=eq.${garageId}` },
      (payload) => {
        domainEmitter.emit(DOMAIN_EVENTS.REFETCH_MEMBERS);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'garage_events', filter: `garage_id=eq.${garageId}` },
      (payload) => {
        const row = payload.new as any;
        if (row.table_name === 'additional_findings') {
            domainEmitter.emit(DOMAIN_EVENTS.REFETCH_FINDINGS);
        } else if (row.table_name === 'deferred_repairs') {
            domainEmitter.emit(DOMAIN_EVENTS.REFETCH_DEFERRED);
        }
      }
    );

    channel.subscribe((status) => {
      // Reconnect lifecycle safety
      if (status === 'SUBSCRIBED') {
        if (lostConnectionRef.current) {
          // If we regained transport layer after dropping, hit the global UI sync
          domainEmitter.emit(DOMAIN_EVENTS.RECONNECT_SYNC);
          lostConnectionRef.current = false;
          loadNotifications(); // Reload notifications on reconnect
        }
      }
      
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        lostConnectionRef.current = true;
      }
    });

    activeChannelRef.current = channel;

    return () => {
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
    };
  }, [garageId, userId, fatalError]); // decoupled from connection state to prevent crash loops

  const markAsRead = async (id: string) => {
    try {
      await supabase.rpc('mark_notification_read', { p_notification_id: id });
       setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch(err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(id => supabase.rpc('mark_notification_read', { p_notification_id: id })));
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch(err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
      {toast && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] animate-in slide-in-from-right fade-in duration-300">
           <div className="bg-stone-900 border border-stone-700 shadow-2xl rounded-2xl p-4 flex gap-3 w-80 md:w-96 relative">
             <div className="shrink-0 mt-0.5">
               <span className="flex h-7 w-7 rounded-full bg-sky-500/20 text-sky-400 items-center justify-center">
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
               </span>
             </div>
             <div className="flex-1 pr-6">
               <h4 className="text-white text-sm font-black tracking-tight">{toast.title}</h4>
               <p className="text-stone-300 text-xs mt-1 leading-relaxed font-medium">{toast.message}</p>
             </div>
             <button onClick={() => setToast(null)} className="absolute top-3 right-3 text-stone-500 hover:text-white transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"></path></svg>
             </button>
           </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
