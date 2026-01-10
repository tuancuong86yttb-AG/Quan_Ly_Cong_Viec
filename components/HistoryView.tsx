
import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryViewProps {
  history: HistoryEntry[];
  onClear: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onClear }) => {
  const getActionInfo = (action: HistoryEntry['action']) => {
    switch (action) {
      case 'create': return { icon: '➕', label: 'Tạo mới', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' };
      case 'delete': return { icon: '🗑️', label: 'Đã xóa', color: 'text-red-500 bg-red-50 dark:bg-red-900/20' };
      case 'complete': return { icon: '✅', label: 'Hoàn thành', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' };
      case 'status_change': return { icon: '🔄', label: 'Cập nhật', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' };
      default: return { icon: '📝', label: 'Hoạt động', color: 'text-slate-500 bg-slate-50 dark:bg-slate-900/20' };
    }
  };

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử hoạt động</h2>
          <p className="text-sm text-slate-500">Theo dõi mọi thay đổi trong kế hoạch của bạn</p>
        </div>
        <button 
          onClick={() => { if(confirm('Xóa toàn bộ lịch sử?')) onClear(); }}
          className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
        >
          Xóa trắng
        </button>
      </div>

      {sortedHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="text-6xl mb-4 opacity-20">📜</div>
          <h3 className="text-lg font-bold text-slate-400">Chưa có hoạt động nào</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">Các hành động như tạo, hoàn thành hoặc xóa nhiệm vụ sẽ được lưu tại đây.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {sortedHistory.map((entry) => {
            const info = getActionInfo(entry.action);
            const date = new Date(entry.timestamp);
            return (
              <div key={entry.id} className="group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${info.color}`}>
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {info.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {date.toLocaleDateString('vi-VN')} • {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    {entry.taskTitle}
                  </h4>
                  {entry.details && (
                    <p className="text-xs text-slate-500 mt-1 italic">{entry.details}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
