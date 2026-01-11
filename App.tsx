
import React, { useState, useEffect, useRef } from 'react';
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
}

// Helper to get local YYYY-MM-DD string
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  
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
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    document.documentElement.style.setProperty('--p-color', accentColor);
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--p-color-soft', `rgba(${r}, ${g}, ${b}, 0.1)`);
    document.documentElement.style.setProperty('--p-color-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

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
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
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

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim() || isQuickAdding) return;

    setIsQuickAdding(true);
    addToast('Gemini đang tạo nhiệm vụ...', 'info');

    try {
      const suggestions = await suggestTasks(quickAddValue);
      if (suggestions && suggestions.length > 0) {
        const suggestion = suggestions[0];
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: suggestion.title || quickAddValue,
          description: suggestion.description || '',
          priority: (suggestion.priority as Priority) || Priority.MEDIUM,
          status: Status.TODO,
          dueDate: getLocalDateString(), // Fixed timezone issue
          subtasks: [],
          category: suggestion.category || CATEGORIES[0]
        };
        setTasks(prev => [newTask, ...prev]);
        addHistoryLog(newTask.id, newTask.title, 'create', 'Tạo nhanh bằng AI');
        addToast('Đã thêm nhiệm vụ mới!');
        setQuickAddValue('');
      }
    } catch (err) {
      addToast('Không thể tạo nhanh, vui lòng thử lại', 'error');
    } finally {
      setIsQuickAdding(false);
    }
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
    addToast('Đang phân tích...', 'info');
    const newSubtaskTitles = await decomposeTask(task.title, task.description);
    if (newSubtaskTitles.length > 0) {
      const newSubtasks: SubTask[] = newSubtaskTitles.map(title => ({
        id: crypto.randomUUID(),
        title,
        completed: false
      }));
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: [...t.subtasks, ...newSubtasks] } : t));
      addToast(`Đã thêm ${newSubtaskTitles.length} mục con!`);
    }
  };

  const checkOverdueTasks = () => {
    const todayStr = getLocalDateString();
    const newNotifications: AppNotification[] = [];
    tasks.forEach(task => {
      if (task.status === Status.DONE) return;
      if (task.dueDate < todayStr) {
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
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <h2 className="hidden lg:block text-xl font-black font-display tracking-tight shrink-0">
                {view === 'board' ? 'Bảng Kanban' : view === 'list' ? 'Danh sách' : view === 'calendar' ? 'Lịch trình' : view === 'history' ? 'Lịch sử' : 'Thống kê'}
              </h2>
              
              <form onSubmit={handleQuickAdd} className="flex-1 max-w-md relative group">
                <input 
                  type="text" 
                  placeholder="Thêm nhanh với AI... (vd: Họp dự án 2h chiều)" 
                  className={`w-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 outline-none transition-all ${isQuickAdding ? 'opacity-50' : ''}`}
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  disabled={isQuickAdding}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">✨</span>
                {isQuickAdding && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </form>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="relative" ref={themeMenuRef}>
                <button 
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${isThemeMenuOpen ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-lg'}`}
                >
                  🎨
                </button>
                {isThemeMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 z-[110] animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest font-display">Màu chủ đạo</p>
                    <div className="flex flex-wrap gap-3 mb-5">
                      {themeColors.map(c => (
                        <button 
                          key={c.hex} onClick={() => setAccentColor(c.hex)} 
                          className={`w-8 h-8 rounded-full transition-all hover:scale-125 shadow-sm ${accentColor === c.hex ? 'ring-2 ring-offset-4 ring-slate-300 dark:ring-slate-600' : ''}`} 
                          style={{ backgroundColor: c.hex }} 
                        />
                      ))}
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mb-4" />
                    <button 
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-black uppercase tracking-tight"
                    >
                      <span>{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
                      <span className="text-base">{theme === 'light' ? '🌙' : '☀️'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`p-2.5 rounded-xl transition-all relative ${isNotifOpen ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'} text-lg`}
                >
                  <span>🔔</span>
                  {notifications.filter(n => !n.isRead).length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                </button>
                {isNotifOpen && (
                  <NotificationPanel 
                    notifications={notifications} onClose={() => setIsNotifOpen(false)} onClearAll={() => setNotifications([])} 
                    onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))} 
                  />
                )}
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

              <button 
                onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
                style={{ backgroundColor: accentColor }}
                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-black shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Thêm mới</span>
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
            {view === 'dashboard' && <Dashboard tasks={filteredTasks} />}
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

        {isFormOpen && (
          <TaskForm 
            task={editingTask} 
            onSave={(data) => { 
              if(editingTask) { 
                setTasks(prev => prev.map(t => t.id === editingTask.id ? {...editingTask, ...data} : t)); 
                addToast('Cập nhật thành công'); 
              } else { 
                const newTask = {...data, id: crypto.randomUUID(), subtasks: []}; 
                setTasks(prev => [newTask, ...prev]); 
                addToast('Đã thêm nhiệm vụ'); 
                addHistoryLog(newTask.id, newTask.title, 'create'); 
              } 
              setIsFormOpen(false); 
            }} 
            onClose={() => setIsFormOpen(false)} 
          />
        )}
        
        {isSyncModalOpen && <SyncHubModal tasks={tasks} onClose={() => setIsSyncModalOpen(false)} onImport={(code) => { try { const data = JSON.parse(atob(code)); setTasks(data); addToast('Đồng bộ thành công'); setIsSyncModalOpen(false); } catch(e) { addToast('Mã không hợp lệ', 'error'); } }} />}

        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-[90vw] space-y-2 pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className={`px-5 py-3.5 rounded-2xl shadow-2xl text-white text-xs font-black uppercase tracking-tight animate-in slide-in-from-top duration-300 flex items-center justify-between gap-4 pointer-events-auto ${toast.type === 'error' ? 'bg-red-500' : 'bg-slate-900/90 backdrop-blur-md border border-white/10'}`}>
               <span className="flex items-center gap-2">
                 {toast.type === 'success' ? '✨' : toast.type === 'info' ? 'ℹ️' : '⚠️'} {toast.message}
               </span>
               <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-50 hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sub-components
interface TaskFormProps { task: Task | null; onSave: (data: any) => void; onClose: () => void; }
const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || Priority.MEDIUM,
    status: task?.status || Status.TODO,
    dueDate: task?.dueDate || getLocalDateString(),
    category: task?.category || CATEGORIES[0]
  });
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] md:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-2xl font-black font-display tracking-tight">{task ? 'Cập nhật' : 'Nhiệm vụ mới'}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">✕</button>
        </div>
        <form className="p-8 space-y-5" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tiêu đề</label>
            <input required className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none border-2 border-transparent focus:border-primary transition-all" placeholder="Tên công việc..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ghi chú</label>
            <textarea className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-medium outline-none h-28 resize-none" placeholder="Thêm mô tả..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ưu tiên</label>
              <select className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-tight" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as Priority})}>
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Hạn chót</label>
              <input type="date" className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full bg-primary text-white py-4.5 rounded-2xl font-black shadow-xl shadow-primary/30 mt-4 active:scale-95 transition-all uppercase tracking-widest">Lưu lại</button>
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
          <h3 className="text-2xl font-black font-display tracking-tight">Đồng bộ 🔄</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">✕</button>
        </div>
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Nhập mã đồng bộ</p>
          <textarea className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 text-xs font-mono min-h-[120px] outline-none" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={() => onImport(code)} className="w-full bg-primary text-white py-4.5 rounded-2xl font-black active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Xác nhận</button>
        </div>
      </div>
    </div>
  );
};

export default App;
