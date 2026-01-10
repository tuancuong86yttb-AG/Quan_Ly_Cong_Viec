
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
  theme, 
  toggleTheme, 
  accentColor, 
  setAccentColor,
  onExport, 
  onImport, 
  onOpenSync,
  lastBackup 
}) => {
  const navItems = [
    { id: 'board' as ViewType, label: 'Bảng', icon: '📋' },
    { id: 'list' as ViewType, label: 'D.Sách', icon: '📝' },
    { id: 'calendar' as ViewType, label: 'Lịch', icon: '📅' },
    { id: 'dashboard' as ViewType, label: 'Báo cáo', icon: '📊' },
  ];

  const themeColors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Violet', hex: '#8b5cf6' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex-col sticky top-0 transition-all duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: accentColor }}>
            <span className="text-2xl">📋</span>
            TaskMaster
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">Chế độ xem</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  currentView === item.id
                    ? 'bg-primary-soft text-primary font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm">{item.label === 'Bảng' ? 'Bảng Kanban' : item.label === 'D.Sách' ? 'Danh sách' : item.label === 'Lịch' ? 'Lịch trình' : 'Thống kê'}</span>
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <div className="px-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-0 mb-1">Thiết bị & Kết nối</p>
            <button 
              onClick={onOpenSync}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="group-hover:rotate-180 transition-transform duration-500 text-lg">🔄</span>
                <div className="flex flex-col items-start">
                    <span className="text-xs font-bold">Đồng bộ Sync</span>
                    <span className="text-[8px] opacity-80 uppercase">PC ⟷ Mobile</span>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">HUB</span>
            </button>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-3 px-4 py-2">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Màu chủ đạo</p>
            <div className="flex flex-wrap gap-2">
              {themeColors.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setAccentColor(color.hex)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                    accentColor === color.hex ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-700' : ''
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {accentColor === color.hex && (
                    <span className="text-[10px] text-white">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="px-4 flex items-center justify-between text-[10px] text-slate-400 font-medium">
             <span>Sao lưu lần cuối:</span>
             <span>{lastBackup || 'Chưa có'}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <span className="text-sm font-medium">
              {theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
            </span>
            <span className="text-lg">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-colors duration-300">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all ${
              currentView === item.id ? 'text-primary' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onOpenSync}
          className="flex flex-col items-center gap-1 px-3 py-1 text-primary animate-pulse"
        >
          <span className="text-xl">🔄</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Sync</span>
        </button>
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 dark:text-slate-500"
        >
          <span className="text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Theme</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
