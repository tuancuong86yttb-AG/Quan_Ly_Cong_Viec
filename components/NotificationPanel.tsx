
import React from 'react';
import { AppNotification } from '../types';

interface NotificationPanelProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onClearAll, 
  onClose 
}) => {
  return (
    <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[120] overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm">Thông báo</h3>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <button 
              onClick={onClearAll}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
            >
              Xóa hết
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-2 opacity-20">🔔</div>
            <p className="text-xs text-slate-400 font-medium">Bạn không có thông báo nào mới</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative group ${!notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    notif.type === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {notif.type === 'overdue' ? '⚠️' : '⏰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${!notif.isRead ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-2 font-medium">
                      {new Date(notif.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary absolute top-4 right-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Bạn có {notifications.filter(n => !n.isRead).length} thông báo chưa đọc</p>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
