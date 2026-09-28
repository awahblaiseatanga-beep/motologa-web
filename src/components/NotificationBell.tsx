import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, Circle } from 'lucide-react';
import { useNotifications, AppNotification, useNotificationTranslation } from './NotificationProvider';
import { useTranslation } from 'react-i18next';

export const NotificationBell: React.FC<{
  onNotificationClick?: (notification: AppNotification) => void;
}> = ({ onNotificationClick }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const translator = useNotificationTranslation();
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEntityClick = async (notif: AppNotification) => {
    if (!notif.read_at) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (onNotificationClick) {
      onNotificationClick(notif);
    }
  };

  return (
    <div className="relative isolate" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-stone-400 hover:text-sky-300 hover:bg-stone-800 rounded-lg transition-all"
        title={t('notifications.title', 'Notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-stone-900 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between">
            <h3 className="font-black text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              {t('notifications.title', 'Notifications')}
              {unreadCount > 0 && (
                <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold">
                  {unreadCount} {t('notifications.new', 'New')}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllAsRead()}
                  className="text-[10px] font-bold text-stone-400 hover:text-white uppercase tracking-wider px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg transition"
                >
                  <CheckCheck className="w-3 h-3 inline-block mr-1" />
                  {t('notifications.markAllRead', 'Mark All Read')}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-stone-500 flex flex-col items-center">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm font-medium">{t('notifications.allCaughtUp')}</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-800/50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-4 transition-colors cursor-pointer hover:bg-stone-800/40 ${!notif.read_at ? 'bg-sky-950/20' : ''}`}
                    onClick={() => handleEntityClick(notif)}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {!notif.read_at ? (
                          <Circle className="w-2.5 h-2.5 fill-sky-500 text-sky-500" />
                        ) : (
                          <Check className="w-3. h-3 text-stone-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-bold ${!notif.read_at ? 'text-white' : 'text-stone-300'}`}>
                            {translator(notif).title}
                          </h4>
                          <span className="text-[10px] font-mono text-stone-500 shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs ${!notif.read_at ? 'text-sky-100/70' : 'text-stone-500'} leading-relaxed`}>
                          {translator(notif).message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
