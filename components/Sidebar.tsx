
import React from 'react';
import { ViewType, Theme } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, theme, toggleTheme }) => {
  const navItems = [
    { id: 'board' as ViewType, label: 'Bảng', icon: '📋' },
    { id: 'list' as ViewType, label: 'D.Sách', icon: '📝' },
    { id: 'dashboard' as ViewType, label: 'Báo cáo', icon: '📊' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex-col sticky top-0 transition-colors duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            TaskMaster
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                currentView === item.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              {item.label === 'Bảng' ? 'Bảng Kanban' : item.label === 'D.Sách' ? 'Danh sách' : 'Thống kê'}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 flex justify-between items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-colors duration-300">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all ${
              currentView === item.id
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 dark:text-slate-500"
        >
          <span className="text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Giao diện</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
