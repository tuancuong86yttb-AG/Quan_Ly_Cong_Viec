
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, ViewType, Status, Priority, SubTask, Theme, HistoryEntry, AppNotification } from './types';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import HistoryView from './components/HistoryView';
import NotificationPanel from './components/NotificationPanel';
import { PRIORITY_COLORS, CATEGORIES } from './constants';
import { decomposeTask, suggestTasks } from './services/geminiService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('task_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('task_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [view, setView] = useState<ViewType>('board');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('accentColor') || '#6366f1';
  });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('lastBackup'));
  
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const themeColors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Violet', hex: '#8b5cf6' },
  ];

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    checkOverdueTasks();
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('task_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('task_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#020617' : accentColor);
    }
  }, [theme, accentColor]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    document.documentElement.style.setProperty('--p-color', accentColor);
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--p-color-soft', `rgba(${r}, ${g}, ${b}, 0.1)`);
    document.documentElement.style.setProperty('--p-color-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

  // Close theme menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const addHistoryLog = (taskId: string, title: string, action: HistoryEntry['action'], details?: string) => {
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      taskId,
      taskTitle: title,
      action,
      timestamp: new Date().toISOString(),
      details
    };
    setHistory(prev => [newEntry, ...prev].slice(0, 100));
  };

  const handleCycleStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        let nextStatus: Status;
        if (task.status === Status.TODO) nextStatus = Status.IN_PROGRESS;
        else if (task.status === Status.IN_PROGRESS) nextStatus = Status.DONE;
        else nextStatus = Status.TODO;
        addHistoryLog(task.id, task.title, nextStatus === Status.DONE ? 'complete' : 'status_change', `Chuyển sang ${nextStatus}`);
        return { ...task, status: nextStatus };
      }
      return task;
    }));
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    addToast('Đã xóa nhiệm vụ', 'info');
    if (taskToDelete) addHistoryLog(taskToDelete.id, taskToDelete.title, 'delete');
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(st => 
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    }));
  };

  const handleDecompose = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    addToast('Gemini đang chia nhỏ nhiệm vụ...', 'info');
    const newSubtaskTitles = await decomposeTask(task.title, task.description);
    if (newSubtaskTitles.length > 0) {
      const newSubtasks: SubTask[] = newSubtaskTitles.map(title => ({
        id: crypto.randomUUID(),
        title,
        completed: false
      }));
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: [...t.subtasks, ...newSubtasks] } : t));
      addToast(`Đã thêm ${newSubtaskTitles.length} công việc con!`);
    }
  };

  const checkOverdueTasks = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const newNotifications: AppNotification[] = [];
    tasks.forEach(task => {
      if (task.status === Status.DONE) return;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < now) {
        const notifId = `overdue-${task.id}-${task.dueDate}`;
        if (!notifications.some(n => n.id === notifId)) {
          newNotifications.push({ id: notifId, taskId: task.id, title: 'Quá hạn!', message: `"${task.title}" đã trễ hạn.`, type: 'overdue', timestamp: new Date().toISOString(), isRead: false });
        }
      }
    });
    if (newNotifications.length > 0) setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="flex h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100">
        <Sidebar 
          currentView={view} setView={setView} theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          accentColor={accentColor} setAccentColor={setAccentColor}
          onExport={() => {}} onImport={() => {}} onOpenSync={() => setIsSyncModalOpen(true)}
          lastBackup={lastBackup}
        />
        
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative pb-[calc(76px+var(--sab))] md:pb-0">
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 pt-4 pb-4 md:py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4">
             <div className="flex items-center justify-between w-full md:w-auto">
              <h2 className="text-xl font-black font-display tracking-tight">
                {view === 'board' ? 'Bảng' : view === 'list' ? 'D.Sách' : view === 'calendar' ? 'Lịch' : view === 'history' ? 'Lịch sử' : 'Báo cáo'}
              </h2>
              <div className="md:hidden flex items-center gap-2">
                 <div className="relative" ref={themeMenuRef}>
                    <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-lg">🎨</button>
                    {isThemeMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-4 z-[60] animate-in slide-in-from-top-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest font-display">Chọn màu chủ đạo</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {themeColors.map(c => (
                            <button key={c.hex} onClick={() => setAccentColor(c.hex)} className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${accentColor === c.hex ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: c.hex }} />
                          ))}
                        </div>
                        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold">
                          <span>{theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}</span>
                          <span>{theme === 'light' ? '🌙' : '☀️'}</span>
                        </button>
                      </div>
                    )}
                 </div>
                 <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 relative text-lg">
                    <span>🔔</span>
                    {notifications.filter(n => !n.isRead).length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                 </button>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[150px]">
                <input 
                  type="text" placeholder="Tìm kiếm..." 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">🔍</span>
              </div>
              
              {/* Desktop Theme Customization Dropdown */}
              <div className="hidden md:block relative" ref={themeMenuRef}>
                <button 
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-lg"
                  title="Tùy chỉnh theme"
                >
                  🎨
                </button>
                {isThemeMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 z-[60] animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest font-display">Chọn màu chủ đạo</p>
                    <div className="flex flex-wrap gap-3 mb-5">
                      {themeColors.map(c => (
                        <button 
                          key={c.hex} 
                          onClick={() => setAccentColor(c.hex)} 
                          className={`w-8 h-8 rounded-full transition-all hover:scale-125 active:scale-95 shadow-sm ${accentColor === c.hex ? 'ring-2 ring-offset-4 ring-slate-300 dark:ring-slate-600' : ''}`} 
                          style={{ backgroundColor: c.hex }} 
                        />
                      ))}
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mb-4" />
                    <button 
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:brightness-95 transition-all text-xs font-black uppercase tracking-tight"
                    >
                      <span>{theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}</span>
                      <span className="text-base">{theme === 'light' ? '🌙' : '☀️'}</span>
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="hidden md:flex p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 relative hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                <span>🔔</span>
                {notifications.filter(n => !n.isRead).length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
              </button>

              <button 
                onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
                style={{ backgroundColor: accentColor }}
                className="hidden md:block px-6 py-2.5 text-white rounded-xl text-sm font-black shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-tight"
              >
                + Thêm mới
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            {view === 'board' && (
              <div className="mobile-board-container flex md:grid md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
                {Object.values(Status).map(status => (
                  <div key={status} className="mobile-board-column flex flex-col gap-4 min-w-[85vw] md:min-w-0">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-display">
                        {status} • {filteredTasks.filter(t => t.status === status).length}
                      </h3>
                    </div>
                    <div className="flex-1 rounded-[32px] p-4 bg-slate-200/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                      {filteredTasks.filter(t => t.status === status).map(task => (
                        <TaskCard 
                          key={task.id} task={task} onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                          onDelete={(id) => handleDeleteTask(id)} onCycleStatus={handleCycleStatus}
                          onToggleSubtask={handleToggleSubtask} onDecompose={handleDecompose}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {view === 'calendar' && <CalendarView tasks={filteredTasks} onEditTask={(t) => { setEditingTask(t); setIsFormOpen(true); }} />}
            {view === 'dashboard' && <Dashboard tasks={tasks} />}
            {view === 'history' && <HistoryView history={history} onClear={() => setHistory([])} />}
            {view === 'list' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                 {filteredTasks.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }} onDelete={(id) => handleDeleteTask(id)} onCycleStatus={handleCycleStatus} onToggleSubtask={handleToggleSubtask} />
                 ))}
              </div>
            )}
          </div>
        </main>

        <button 
          onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
          style={{ backgroundColor: accentColor }}
          className="md:hidden fixed bottom-[calc(90px+var(--sab))] right-6 w-14 h-14 rounded-2xl text-white shadow-2xl shadow-primary/40 flex items-center justify-center text-3xl z-[60] active:scale-90 transition-all font-display"
        >
          +
        </button>

        {isFormOpen && <TaskForm task={editingTask} onSave={(data) => { if(editingTask) { setTasks(prev => prev.map(t => t.id === editingTask.id ? {...editingTask, ...data} : t)); addToast('Cập nhật thành công'); } else { const newTask = {...data, id: crypto.randomUUID(), subtasks: []}; setTasks(prev => [newTask, ...prev]); addToast('Đã thêm nhiệm vụ'); addHistoryLog(newTask.id, newTask.title, 'create'); } setIsFormOpen(false); }} onClose={() => setIsFormOpen(false)} />}
        
        {isSyncModalOpen && <SyncHubModal tasks={tasks} onClose={() => setIsSyncModalOpen(false)} onImport={(code) => { try { const data = JSON.parse(atob(code)); setTasks(data); addToast('Đồng bộ thành công'); setIsSyncModalOpen(false); } catch(e) { addToast('Mã không hợp lệ', 'error'); } }} />}

        {isNotifOpen && (
           <NotificationPanel 
             notifications={notifications} onClose={() => setIsNotifOpen(false)} onClearAll={() => setNotifications([])} 
             onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))} 
           />
        )}

        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[90vw] space-y-2 pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className={`px-5 py-3.5 rounded-2xl shadow-2xl text-white text-xs font-black uppercase tracking-tight animate-in slide-in-from-top duration-300 flex items-center justify-between gap-4 pointer-events-auto ${toast.type === 'error' ? 'bg-red-500' : 'bg-slate-900/90 backdrop-blur-md border border-white/10'}`}>
               <span className="flex items-center gap-2">
                 {toast.type === 'success' ? '✨' : 'ℹ️'} {toast.message}
               </span>
               <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-50 hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sub-components as defined in the previous working version
interface TaskFormProps { task: Task | null; onSave: (data: any) => void; onClose: () => void; }
const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || Priority.MEDIUM,
    status: task?.status || Status.TODO,
    dueDate: task?.dueDate || new Date().toISOString().split('T')[0],
    category: task?.category || CATEGORIES[0]
  });
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] md:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-2xl font-black font-display tracking-tight">{task ? 'Cập nhật' : 'Nhiệm vụ mới'}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">✕</button>
        </div>
        <form className="p-8 space-y-5" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tiêu đề công việc</label>
            <input required className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none border-2 border-transparent focus:border-primary transition-all" placeholder="Nhập tiêu đề..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mô tả chi tiết</label>
            <textarea className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-medium outline-none h-28 resize-none" placeholder="Ghi chú thêm về công việc..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ưu tiên</label>
              <select className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-tight" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as Priority})}>
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Danh mục</label>
              <select className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-tight" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Hạn hoàn thành</label>
            <input type="date" className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-primary text-white py-4.5 rounded-2xl font-black shadow-xl shadow-primary/30 mt-4 active:scale-95 transition-all uppercase tracking-widest">Lưu nhiệm vụ</button>
          <div className="h-[var(--sab)] md:hidden" />
        </form>
      </div>
    </div>
  );
};

interface SyncHubModalProps { tasks: Task[]; onClose: () => void; onImport: (code: string) => void; }
const SyncHubModal: React.FC<SyncHubModalProps> = ({ tasks, onClose, onImport }) => {
  const [code, setCode] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] p-8 space-y-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black font-display tracking-tight">Sync Hub 🔄</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">✕</button>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Mã đồng bộ hiện tại</p>
          <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[9px] break-all font-mono opacity-60 leading-relaxed border border-slate-200 dark:border-slate-700">
            {btoa(JSON.stringify(tasks))}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(btoa(JSON.stringify(tasks))); alert('Đã sao chép mã!'); }} className="text-[10px] font-bold text-primary ml-1 uppercase">Sao chép mã</button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Nhập mã đồng bộ mới</p>
          <textarea className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 text-xs font-mono min-h-[120px] outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Dán mã tại đây..." value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={() => onImport(code)} className="w-full bg-primary text-white py-4.5 rounded-2xl font-black active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Bắt đầu đồng bộ</button>
        </div>
      </div>
    </div>
  );
};

export default App;
