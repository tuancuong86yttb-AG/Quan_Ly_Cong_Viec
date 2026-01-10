
import React, { useState, useEffect, useRef } from 'react';
import { Task, ViewType, Status, Priority, SubTask, Theme } from './types';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';

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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAddBtnPopping, setIsAddBtnPopping] = useState(false);
  
  // Sync States
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncPreviewTasks, setSyncPreviewTasks] = useState<Task[] | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('lastBackup'));
  const [tasksBeforeSync, setTasksBeforeSync] = useState<Task[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync Accent Color to CSS Variables
  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    document.documentElement.style.setProperty('--p-color', accentColor);
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--p-color-soft', `rgba(${r}, ${g}, ${b}, 0.1)`);
    document.documentElement.style.setProperty('--p-color-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success', action?: { label: string; onClick: () => void }) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(tasks, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const now = new Date();
      const exportFileDefaultName = `taskmaster_backup_${now.toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem('lastBackup', timeStr);
      setLastBackup(timeStr);
      addToast('Đã xuất file sao lưu thành công!');
    } catch (e) {
      addToast('Lỗi khi xuất dữ liệu', 'error');
    }
  };

  const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTasks = JSON.parse(e.target?.result as string) as Task[];
        if (!Array.isArray(importedTasks)) throw new Error('Định dạng file không hợp lệ');
        setSyncPreviewTasks(importedTasks);
      } catch (err) {
        addToast('File không đúng định dạng TaskMaster JSON', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSyncFromCode = (code: string) => {
    try {
      const decodedData = atob(code);
      const importedTasks = JSON.parse(decodedData) as Task[];
      if (!Array.isArray(importedTasks)) throw new Error();
      setSyncPreviewTasks(importedTasks);
      setIsSyncModalOpen(false);
    } catch (e) {
      addToast('Mã đồng bộ không hợp lệ', 'error');
    }
  };

  const handleUndoSync = () => {
    if (tasksBeforeSync) {
      setTasks(tasksBeforeSync);
      setTasksBeforeSync(null);
      addToast('Đã hoàn tác các thay đổi đồng bộ', 'info');
    }
  };

  const confirmSync = (selectedIds: Set<string>, mode: 'merge' | 'replace') => {
    if (!syncPreviewTasks) return;
    setTasksBeforeSync([...tasks]);

    let updatedCount = 0;
    let addedCount = 0;

    const tasksToImport = syncPreviewTasks.filter(t => selectedIds.has(t.id));

    if (mode === 'replace') {
      setTasks(tasksToImport);
      addedCount = tasksToImport.length;
    } else {
      setTasks(prevTasks => {
        const newTasks = [...prevTasks];
        tasksToImport.forEach(impTask => {
          const existingIndex = newTasks.findIndex(t => t.id === impTask.id);
          if (existingIndex !== -1) {
            newTasks[existingIndex] = impTask;
            updatedCount++;
          } else {
            newTasks.unshift(impTask);
            addedCount++;
          }
        });
        return newTasks;
      });
    }

    addToast(
      mode === 'replace' ? 'Đã ghi đè toàn bộ dữ liệu' : `Đồng bộ xong: +${addedCount} mới, ~${updatedCount} cập nhật`, 
      'success', 
      { label: 'Hoàn tác', onClick: handleUndoSync }
    );
    setSyncPreviewTasks(null);
  };

  const triggerAddAction = () => {
    setIsAddBtnPopping(true);
    setEditingTask(null);
    setIsFormOpen(true);
    setTimeout(() => setIsAddBtnPopping(false), 200);
  };

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
    };
    setTasks(prev => [newTask, ...prev]);
    setIsFormOpen(false);
    addToast('Đã thêm nhiệm vụ mới');
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
    setIsFormOpen(false);
    addToast('Đã cập nhật nhiệm vụ');
  };

  const handleCycleStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        let nextStatus: Status;
        if (task.status === Status.TODO) nextStatus = Status.IN_PROGRESS;
        else if (task.status === Status.IN_PROGRESS) nextStatus = Status.DONE;
        else nextStatus = Status.TODO;
        return { ...task, status: nextStatus };
      }
      return task;
    }));
  };

  const handleDeleteTask = (id: string, skipConfirm: boolean = true) => {
    if (skipConfirm || confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
      addToast('Đã xóa nhiệm vụ', 'info');
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300 text-slate-800 dark:text-slate-100">
        <Sidebar 
          currentView={view} 
          setView={setView} 
          theme={theme} 
          toggleTheme={toggleTheme}
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          onExport={handleExportData}
          onImport={() => fileInputRef.current?.click()}
          onOpenSync={() => setIsSyncModalOpen(true)}
          lastBackup={lastBackup}
        />
        
        <input type="file" ref={fileInputRef} onChange={handleImportFileSelect} className="hidden" accept=".json" />

        <main className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden relative transition-all duration-500 pb-16 md:pb-0 ${isDragging ? 'bg-slate-200/50 dark:bg-slate-900/50' : ''}`}>
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-10 transition-colors gap-4">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <h2 className="text-lg md:text-xl font-bold truncate">
                {view === 'board' ? 'Bảng Kanban' : view === 'list' ? 'Danh sách' : view === 'calendar' ? 'Lịch trình' : 'Thống kê'}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={triggerAddAction}
                  style={{ backgroundColor: accentColor }}
                  className={`md:hidden px-3 py-1.5 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap transition-transform hover:brightness-110 ${isAddBtnPopping ? 'animate-pop' : ''}`}
                >
                  + Nhiệm vụ
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input 
                  type="text" 
                  placeholder="Tìm nhiệm vụ..." 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary dark:text-slate-100 dark:placeholder-slate-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={triggerAddAction}
                style={{ backgroundColor: accentColor }}
                className={`hidden md:block px-4 py-2 text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all shadow-sm ${isAddBtnPopping ? 'animate-pop' : ''}`}
              >
                + Thêm nhiệm vụ
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {view === 'board' && (
              <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 h-full overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 snap-x snap-mandatory">
                {Object.values(Status).map(status => (
                  <div key={status} className="flex flex-col gap-4 min-w-[280px] md:min-w-0 snap-center">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {status} ({filteredTasks.filter(t => t.status === status).length})
                      </h3>
                    </div>
                    <div className="flex-1 rounded-2xl p-3 md:p-4 border bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 space-y-4 min-h-[400px]">
                      {filteredTasks.filter(t => t.status === status).map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                          onDelete={(id) => handleDeleteTask(id, true)}
                          onCycleStatus={handleCycleStatus}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {view === 'calendar' && <CalendarView tasks={filteredTasks} onEditTask={(t) => { setEditingTask(t); setIsFormOpen(true); }} />}
            {view === 'dashboard' && <Dashboard tasks={tasks} />}
            {view === 'list' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nhiệm vụ</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-sm">{task.title}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => { setEditingTask(task); setIsFormOpen(true); }}>✏️</button>
                          <button onClick={() => handleDeleteTask(task.id, false)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            )}
          </div>
        </main>

        {isSyncModalOpen && (
          <SyncHubModal 
            tasks={tasks}
            onClose={() => setIsSyncModalOpen(false)}
            onImport={handleSyncFromCode}
          />
        )}

        {syncPreviewTasks && (
          <SyncPreviewModal 
            previewTasks={syncPreviewTasks}
            existingTasks={tasks}
            onConfirm={confirmSync}
            onClose={() => setSyncPreviewTasks(null)}
          />
        )}

        {isFormOpen && (
          <TaskForm 
            task={editingTask} 
            onSave={editingTask ? handleUpdateTask : handleAddTask}
            onClose={() => setIsFormOpen(false)} 
          />
        )}

        <div className="fixed bottom-20 md:bottom-6 right-6 z-[100] flex flex-col gap-2">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-in slide-in-from-right-full duration-300 flex items-center justify-between gap-4 ${
                toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-slate-800' : 'bg-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}</span>
                {toast.message}
              </div>
              {toast.action && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.action?.onClick();
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Sync Components ---

interface SyncHubModalProps {
  tasks: Task[];
  onClose: () => void;
  onImport: (code: string) => void;
}

const SyncHubModal: React.FC<SyncHubModalProps> = ({ tasks, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [syncCode, setSyncCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (activeTab === 'send') {
      const dataStr = btoa(JSON.stringify(tasks));
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dataStr)}`;
      setQrDataUrl(url);
    }
  }, [activeTab, tasks]);

  const handleCopyCode = () => {
    const dataStr = btoa(JSON.stringify(tasks));
    navigator.clipboard.writeText(dataStr);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleManualImport = () => {
    if (syncCode.trim()) onImport(syncCode);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <span>🔄</span> Trung tâm Đồng bộ
          </h3>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600 transition-colors">×</button>
        </div>

        <div className="flex p-2 bg-slate-100 dark:bg-slate-800 m-4 rounded-xl">
          <button 
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'send' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Gửi đi
          </button>
          <button 
            onClick={() => setActiveTab('receive')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'receive' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Nhận về
          </button>
        </div>

        <div className="px-6 pb-8 flex-1 overflow-y-auto">
          {activeTab === 'send' ? (
            <div className="text-center space-y-6">
              <p className="text-sm text-slate-500">Quét mã QR bằng Camera của điện thoại hoặc máy tính khác để chuyển <b>{tasks.length}</b> nhiệm vụ.</p>
              <div className="bg-white p-4 rounded-2xl inline-block border-4 border-slate-50 shadow-inner">
                {qrDataUrl ? <img src={qrDataUrl} alt="Sync QR" className="w-48 h-48 mx-auto" /> : <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg" />}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hoặc sử dụng mã</p>
                <div className="flex gap-2">
                  <input readOnly value={btoa(JSON.stringify(tasks)).slice(0, 15) + "..."} className="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-[10px] text-slate-400 outline-none" />
                  <button onClick={handleCopyCode} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all">
                    {isCopying ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4">
                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto text-2xl shadow-sm">📷</div>
                <p className="text-sm text-slate-500">Sử dụng Camera để quét nhanh</p>
                <button className="px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-full hover:bg-slate-950 transition-all">Mở Camera</button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white dark:bg-slate-900 px-2 w-max mx-auto">Hoặc dán mã</div>
              </div>

              <div className="space-y-3">
                <textarea 
                  placeholder="Dán mã đồng bộ vào đây..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-4 py-3 text-xs h-24 outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                  value={syncCode}
                  onChange={(e) => setSyncCode(e.target.value)}
                />
                <button 
                  onClick={handleManualImport}
                  disabled={!syncCode.trim()}
                  className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Bắt đầu Đồng bộ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SyncPreviewModalProps {
  previewTasks: Task[];
  existingTasks: Task[];
  onConfirm: (selectedIds: Set<string>, mode: 'merge' | 'replace') => void;
  onClose: () => void;
}

const SyncPreviewModal: React.FC<SyncPreviewModalProps> = ({ previewTasks, existingTasks, onConfirm, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(previewTasks.map(t => t.id)));
  const [syncMode, setSyncMode] = useState<'merge' | 'replace'>('merge');

  const toggleTask = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[160] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold dark:text-white">Kiểm tra dữ liệu đồng bộ</h3>
            <p className="text-xs text-slate-400">Chọn nhiệm vụ và phương thức nhập</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400">×</button>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm shrink-0 border border-amber-100 dark:border-amber-800">
            <button onClick={() => setSyncMode('merge')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${syncMode === 'merge' ? 'bg-amber-500 text-white' : 'text-amber-600'}`}>Hợp nhất</button>
            <button onClick={() => setSyncMode('replace')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${syncMode === 'replace' ? 'bg-red-500 text-white' : 'text-red-600'}`}>Ghi đè</button>
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
            {syncMode === 'merge' ? 'Giữ lại các việc hiện có và thêm/cập nhật việc mới.' : 'Xóa sạch danh sách hiện tại và thay bằng dữ liệu mới này.'}
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-950/20">
          {previewTasks.map(t => {
            const isUpdate = existingTasks.some(et => et.id === t.id);
            return (
              <div 
                key={t.id} 
                onClick={() => toggleTask(t.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedIds.has(t.id) ? 'bg-primary-soft border-primary/40' : 'bg-white dark:bg-slate-900 border-transparent opacity-60'
                }`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.has(t.id) ? 'bg-primary border-primary' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}>
                  {selectedIds.has(t.id) && <span className="text-white text-[10px]">✓</span>}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold dark:text-white line-clamp-1">{t.title}</h4>
                  <p className="text-[10px] text-slate-500">{t.dueDate} • {t.category}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isUpdate ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'}`}>
                  {isUpdate ? 'Cập nhật' : 'Mới'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium">Hủy bỏ</button>
          <button 
            onClick={() => onConfirm(selectedIds, syncMode)} 
            disabled={selectedIds.size === 0}
            className={`flex-[2] py-3 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg transition-all ${syncMode === 'replace' ? 'bg-red-600' : 'bg-primary'}`}
          >
            {syncMode === 'replace' ? 'Ghi đè tất cả' : `Đồng bộ ${selectedIds.size} mục`}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TaskFormProps {
  task?: Task | null;
  onSave: (task: any) => void;
  onClose: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || Priority.MEDIUM,
    status: task?.status || Status.TODO,
    dueDate: task?.dueDate || new Date().toISOString().split('T')[0],
    category: task?.category || 'Công việc',
  });
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(task ? { ...task, ...formData, subtasks } : { ...formData, subtasks });
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: crypto.randomUUID(), title: newSubtaskTitle, completed: false }]);
    setNewSubtaskTitle('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-full max-h-[95vh] md:max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="px-6 py-5 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
            <h3 className="text-lg font-bold dark:text-white">{task ? 'Sửa nhiệm vụ' : 'Nhiệm vụ mới'}</h3>
            <button type="button" onClick={onClose} className="text-3xl text-slate-400">×</button>
          </div>
          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tiêu đề</label>
              <input required className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mô tả</label>
              <textarea className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none h-20 resize-none dark:text-white" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ưu tiên</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-3 py-3 text-sm outline-none dark:text-white focus:ring-2 focus:ring-primary" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}>
                  {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hạn chót</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-3 py-3 text-sm outline-none dark:text-white focus:ring-2 focus:ring-primary" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Công việc con</label>
              </div>
              <div className="space-y-2 mb-4">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border dark:border-slate-700">
                    <input type="checkbox" checked={st.completed} className="accent-primary" onChange={() => setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))} />
                    <span className={`text-xs flex-1 dark:text-white ${st.completed ? 'line-through text-slate-400' : ''}`}>{st.title}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none dark:text-white focus:ring-2 focus:ring-primary" value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} placeholder="Thêm công việc con..." />
                <button type="button" onClick={addSubtask} className="px-4 bg-slate-100 dark:bg-slate-700 rounded-xl dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">+</button>
              </div>
            </div>
          </div>
          <div className="p-6 border-t dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-3 border dark:border-slate-700 rounded-xl text-sm dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Hủy</button>
            <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg hover:brightness-110 transition-all">Lưu lại</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
