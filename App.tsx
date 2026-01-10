
import React, { useState, useEffect, useCallback } from 'react';
import { Task, ViewType, Status, Priority, SubTask, Theme } from './types';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import Dashboard from './components/Dashboard';
import { CATEGORIES } from './constants';
import { suggestTasks, decomposeTask } from './services/geminiService';

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAISuggestModalOpen, setIsAISuggestModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAddBtnPopping, setIsAddBtnPopping] = useState(false);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
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
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
    setIsFormOpen(false);
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
    }
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDragOverStatus(null);
    setIsDragging(false);
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== status) {
      handleUpdateTask({ ...task, status });
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar 
          currentView={view} 
          setView={setView} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />
        
        <main className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden relative transition-all duration-500 pb-16 md:pb-0 ${isDragging ? 'bg-slate-200/50 dark:bg-slate-900/50' : ''}`}>
          {/* Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-10 transition-colors gap-4">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {view === 'board' ? 'Bảng Kanban' : view === 'list' ? 'Danh sách' : 'Thống kê'}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAISuggestModalOpen(true)}
                  className="md:hidden p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm transition-all"
                  title="Gợi ý bởi AI"
                >
                  ✨
                </button>
                <button 
                  onClick={triggerAddAction}
                  className={`md:hidden px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm whitespace-nowrap transition-transform ${isAddBtnPopping ? 'animate-pop' : ''}`}
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
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 dark:placeholder-slate-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setIsAISuggestModalOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md active:scale-95"
              >
                <span>✨ Gợi ý AI</span>
              </button>
              <button 
                onClick={triggerAddAction}
                className={`hidden md:block px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors shadow-sm ${isAddBtnPopping ? 'animate-pop' : ''}`}
              >
                + Thêm nhiệm vụ
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {view === 'board' && (
              <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 h-full overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 snap-x snap-mandatory">
                {Object.values(Status).map(status => (
                  <div 
                    key={status} 
                    className="flex flex-col gap-4 min-w-[280px] md:min-w-0 snap-center"
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={() => setDragOverStatus(null)}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="flex items-center justify-between px-2">
                      <h3 className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${dragOverStatus === status ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {status} ({filteredTasks.filter(t => t.status === status).length})
                      </h3>
                    </div>
                    <div className={`flex-1 rounded-2xl p-3 md:p-4 border transition-all duration-300 space-y-4 min-h-[400px] relative overflow-hidden ${
                      dragOverStatus === status 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 dark:border-indigo-500 border-dashed ring-4 ring-indigo-500/10' 
                      : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800'
                    }`}>
                      {dragOverStatus === status && (
                        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none animate-pulse" />
                      )}
                      
                      {filteredTasks.filter(t => t.status === status).map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                          onDelete={(id) => handleDeleteTask(id, true)}
                          onCycleStatus={handleCycleStatus}
                          onDragStartGlobal={() => setIsDragging(true)}
                          onDragEndGlobal={() => {
                            setIsDragging(false);
                            setDragOverStatus(null);
                          }}
                        />
                      ))}
                      {filteredTasks.filter(t => t.status === status).length === 0 && (
                        <div className={`h-24 flex items-center justify-center border-2 border-dashed rounded-xl text-[10px] transition-colors duration-300 ${
                          dragOverStatus === status 
                          ? 'border-indigo-400 text-indigo-500' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                        }`}>
                          Trống
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'list' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm animate-in slide-in-from-bottom-4 duration-500 transition-colors">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Nhiệm vụ</th>
                      <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
                      <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Ưu tiên</th>
                      <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 md:px-6 py-4">
                          <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{task.title}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{task.dueDate} • {task.category}</div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <button 
                            onClick={() => handleCycleStatus(task.id)}
                            className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase transition-all active:scale-90 flex items-center gap-1 ${
                              task.status === Status.DONE ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                              task.status === Status.IN_PROGRESS ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {task.status} 🔄
                          </button>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                            task.priority === Priority.HIGH ? 'text-red-600 dark:text-red-400' :
                            task.priority === Priority.MEDIUM ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right space-x-2">
                          <button onClick={() => { setEditingTask(task); setIsFormOpen(true); }} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">✏️</button>
                          <button onClick={() => handleDeleteTask(task.id, false)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === 'dashboard' && <Dashboard tasks={tasks} />}
          </div>
        </main>

        {/* Task Form Modal */}
        {isFormOpen && (
          <TaskForm 
            task={editingTask} 
            onSave={editingTask ? handleUpdateTask : handleAddTask}
            onClose={() => setIsFormOpen(false)} 
          />
        )}

        {/* AI Suggestion Modal */}
        {isAISuggestModalOpen && (
          <AISuggestionModal 
            onClose={() => setIsAISuggestModalOpen(false)}
            onAddTasks={(suggestedTasks) => {
              const formattedTasks: Task[] = suggestedTasks.map(t => ({
                id: crypto.randomUUID(),
                title: t.title || 'Nhiệm vụ mới',
                description: t.description || '',
                priority: t.priority as Priority || Priority.MEDIUM,
                category: t.category || 'Công việc',
                status: Status.TODO,
                dueDate: new Date().toISOString().split('T')[0],
                subtasks: []
              }));
              setTasks(prev => [...formattedTasks, ...prev]);
              setIsAISuggestModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

interface AISuggestionModalProps {
  onClose: () => void;
  onAddTasks: (tasks: Partial<Task>[]) => void;
}

const AISuggestionModal: React.FC<AISuggestionModalProps> = ({ onClose, onAddTasks }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Partial<Task>[]>([]);

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    const result = await suggestTasks(topic);
    setSuggestions(result);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-2xl">✨</span> Gợi ý nhiệm vụ AI
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition-colors">×</button>
          </div>

          {!suggestions.length ? (
            <form onSubmit={handleSuggest} className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Nhập chủ đề bạn muốn AI lên kế hoạch giúp (ví dụ: "Học lập trình React", "Dọn dẹp nhà cửa", "Kế hoạch đi du lịch Đà Lạt").</p>
              <input 
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 transition-all"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Nhập chủ đề..."
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang suy nghĩ...</> : 'Tạo kế hoạch'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {suggestions.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{s.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{s.description}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{s.category}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded uppercase">{s.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSuggestions([])} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Làm lại</button>
                <button onClick={() => onAddTasks(suggestions)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">Thêm tất cả</button>
              </div>
            </div>
          )}
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
  const [isDecomposing, setIsDecomposing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(task ? { ...task, ...formData, subtasks } : { ...formData, subtasks });
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const updateSubtaskTitle = (id: string, title: string) => {
    setSubtasks(prev => prev.map(st => st.id === id ? { ...st, title } : st));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  const addSubtask = (title?: string) => {
    const finalTitle = title || newSubtaskTitle.trim();
    if (!finalTitle) return;
    const newSt: SubTask = {
      id: crypto.randomUUID(),
      title: finalTitle,
      completed: false
    };
    setSubtasks(prev => [...prev, newSt]);
    if (!title) setNewSubtaskTitle('');
  };

  const handleDecompose = async () => {
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề nhiệm vụ trước khi chia nhỏ.');
      return;
    }
    setIsDecomposing(true);
    const suggestedSubtasks = await decomposeTask(formData.title, formData.description);
    if (suggestedSubtasks.length > 0) {
      const newSts: SubTask[] = suggestedSubtasks.map(title => ({
        id: crypto.randomUUID(),
        title,
        completed: false
      }));
      setSubtasks(prev => [...prev, ...newSts]);
    }
    setIsDecomposing(false);
  };

  const handleNewSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800 h-full max-h-[95vh] md:max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Sticky Header */}
          <div className="px-6 md:px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20 transition-colors shrink-0">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{task ? 'Sửa nhiệm vụ' : 'Nhiệm vụ mới'}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-3xl transition-colors">×</button>
          </div>
          
          {/* Scrollable Content */}
          <div className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tiêu đề</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 dark:placeholder-slate-600 transition-all"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ví dụ: Lập kế hoạch dự án..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Mô tả</label>
              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none dark:text-slate-100 dark:placeholder-slate-600 transition-all"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ghi chú thêm thông tin cho AI..."
              />
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Ưu tiên</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                >
                  {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">D.Mục</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Date & Status */}
            <div className="grid grid-cols-2 gap-3">
               <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Ngày</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              {task && (
                 <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">T.Thái</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
                  >
                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Công việc con</label>
                <button 
                  type="button"
                  onClick={handleDecompose}
                  disabled={isDecomposing || !formData.title.trim()}
                  className="text-[10px] font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {isDecomposing ? <div className="w-2 h-2 border border-indigo-500 border-t-transparent rounded-full animate-spin" /> : '✨'} Chia nhỏ AI
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 pl-3 rounded-xl border border-slate-100 dark:border-slate-700 group animate-in slide-in-from-left-2 duration-300">
                    <input 
                      type="checkbox" 
                      checked={st.completed} 
                      onChange={() => toggleSubtask(st.id)}
                      className="w-4 h-4 rounded text-indigo-600 dark:text-indigo-400 transition-all"
                    />
                    <input 
                      type="text"
                      className={`flex-1 bg-transparent border-none outline-none text-xs transition-all ${st.completed ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'}`}
                      value={st.title}
                      onChange={(e) => updateSubtaskTitle(st.id, e.target.value)}
                    />
                    <button type="button" onClick={() => removeSubtask(st.id)} className="p-1 hover:text-red-500 text-slate-300 transition-all">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={handleNewSubtaskKeyDown}
                  placeholder="Thêm nhanh..."
                />
                <button type="button" onClick={() => addSubtask()} className="px-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold">+</button>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900 sticky bottom-0 z-20 transition-colors shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm transition-colors shadow-lg active:scale-95"
            >
              {task ? 'Cập nhật' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
