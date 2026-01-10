
import React from 'react';
import { ViewType, Theme } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  theme: Theme;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  onExport: () => void;
  onImport: () => void;
  onOpenSync: () => void;
  lastBackup: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  accentColor, 
  onOpenSync,
  lastBackup 
}) => {
  const navItems = [
    { id: 'board' as ViewType, label: 'Bảng', icon: '📋' },
    { id: 'list' as ViewType, label: 'D.Sách', icon: '📝' },
    { id: 'calendar' as ViewType, label: 'Lịch', icon: '📅' },
    { id: 'history' as ViewType, label: 'L.Sử', icon: '📜' },
    { id: 'dashboard' as ViewType, label: 'B.Cáo', icon: '📊' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex-col sticky top-0 transition-all duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-2xl font-black flex items-center gap-3 font-display tracking-tighter" style={{ color: accentColor }}>
            <span className="text-4xl drop-shadow-sm">📋</span>
            TaskMaster
          </h1>
        </div>
        <nav className="flex-1 p-6 space-y-10 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 font-display">Điều hướng</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                  currentView === item.id
                    ? 'bg-primary-soft text-primary font-black shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm">
                  {item.id === 'board' ? 'Bảng Kanban' : 
                   item.id === 'list' ? 'Danh sách việc' : 
                   item.id === 'calendar' ? 'Lịch trình' : 
                   item.id === 'history' ? 'Lịch sử' : 
                   'Thống kê'}
                </span>
              </button>
            ))}
          </div>

          <div className="px-4 py-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl mx-2">
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-3xl">🤖</span>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">Gemini AI luôn sẵn sàng hỗ trợ bạn chia nhỏ công việc.</p>
            </div>
          </div>
        </nav>
        
        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
           <button 
              onClick={onOpenSync}
              className="w-full bg-primary text-white p-4 rounded-2xl font-black text-xs shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest"
            >
              <span>🔄</span> Đồng bộ dữ liệu
           </button>
           {lastBackup && <p className="text-[9px] text-center text-slate-400 mt-3 font-bold">Lần cuối: {lastBackup}</p>}
        </div>
      </aside>

      {/* Optimized Android 15 Mobile Navigation */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/95 backdrop-blur-3xl border-t border-slate-200 dark:border-slate-800 z-[100] transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: 'calc(12px + var(--sab))' }}
      >
        <div className="flex justify-around items-center px-4 pt-3">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`relative flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-2xl transition-all duration-300 ${
                  isActive ? 'scale-110' : 'text-slate-400 dark:text-slate-500 active:scale-90'
                }`}
              >
                <span className={`text-2xl transition-all ${isActive ? 'drop-shadow-[0_0_8px_var(--p-color-soft)]' : 'grayscale opacity-60'}`}>
                  {item.icon}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-tight font-display ${isActive ? 'text-primary' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--p-color)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
