
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, Priority, Status, SubTask } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS } from '../constants';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onCycleStatus?: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onDecompose?: (taskId: string) => void;
  onDragStartGlobal?: () => void;
  onDragEndGlobal?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onEdit, 
  onDelete, 
  onCycleStatus, 
  onToggleSubtask,
  onDecompose,
  onDragStartGlobal, 
  onDragEndGlobal 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const prevStatusRef = useRef<Status>(task.status);

  useEffect(() => {
    if (task.status === Status.DONE && prevStatusRef.current !== Status.DONE) {
      setIsCelebrating(true);
      const timer = setTimeout(() => setIsCelebrating(false), 600);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = task.status;
  }, [task.status]);

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;

  const urgency = useMemo(() => {
    if (task.status === Status.DONE) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (dueDate < today) return 'overdue';
    if (diffDays === 0) return 'due-today';
    return 'none';
  }, [task.dueDate, task.status]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.classList.add('opacity-20');
    if (onDragStartGlobal) onDragStartGlobal();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.classList.remove('opacity-20');
    if (onDragEndGlobal) onDragEndGlobal();
  };

  const handleCycleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShaking(true);
    if (onCycleStatus) onCycleStatus(task.id);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) {
      setIsDeleting(true);
      setTimeout(() => onDelete(task.id), 400);
    }
  };

  const handleToggleClick = () => setIsExpanded(!isExpanded);

  const getDateStatusStyles = () => {
    if (task.status === Status.DONE) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800';
    switch (urgency) {
      case 'overdue': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800 ring-1 ring-red-500/10';
      case 'due-today': return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800 animate-pulse';
      default: return 'bg-primary-soft text-primary border-primary/10 dark:border-primary/20';
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleToggleClick}
      className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 group cursor-pointer relative overflow-hidden ${isShaking ? 'animate-shake' : ''} ${isDeleting ? 'animate-pop-out' : ''} ${isCelebrating ? 'animate-celebrate z-10' : ''} ${isExpanded ? 'ring-2 ring-primary/20 shadow-primary/10' : ''}`}
    >
      {isCelebrating && (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none flex items-center justify-center">
          <span className="text-4xl animate-bounce">🎊</span>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border tracking-wider font-display ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          <button 
            onClick={handleCycleClick}
            className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border tracking-wider font-display transition-all active:scale-90 ${
              task.status === Status.DONE ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20' :
              task.status === Status.IN_PROGRESS ? 'bg-primary-soft text-primary border-primary/20 dark:bg-primary/20' :
              'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800'
            }`}
          >
            {task.status} 🔄
          </button>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg transition-colors" title="Chỉnh sửa">✏️</button>
          <button onClick={handleDeleteClick} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg transition-colors" title="Xóa">🗑️</button>
        </div>
      </div>
      
      <div className="flex items-start gap-2 mb-2">
        <h3 className={`font-bold leading-[1.3] font-display transition-colors text-base flex-1 ${task.status === Status.DONE ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
          {task.title}
        </h3>
        <span className={`transition-transform duration-300 text-slate-300 text-[10px] mt-1.5 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {/* Task-level Progress Bar */}
      {task.subtasks.length > 0 && (
        <div className="mb-4 animate-in fade-in slide-in-from-left-2 duration-500">
          <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 mb-1.5 font-black uppercase tracking-widest font-display">
            <span className={progress === 100 ? 'text-emerald-500' : 'text-primary'}>Tiến độ {Math.round(progress)}%</span>
            <span>{completedSubtasks}/{task.subtasks.length} mục</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-full h-1.5 overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-primary shadow-[0_0_5px_rgba(var(--p-color-rgb),0.3)]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold mb-4 transition-colors font-display ${getDateStatusStyles()}`}>
        <span className="text-sm">{urgency === 'overdue' ? '⚠️' : urgency === 'due-today' ? '⏰' : '📅'}</span>
        <span>{task.dueDate}</span>
      </div>

      <p className={`text-sm mb-5 leading-relaxed transition-all ${isExpanded ? 'opacity-100' : 'line-clamp-2 opacity-70'} ${task.status === Status.DONE ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
        {task.description}
      </p>

      {/* Expanded Subtasks List */}
      {isExpanded && (
        <div className="space-y-4 mb-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-display">Chi tiết công việc con</h4>
            {onDecompose && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDecompose(task.id); }}
                className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full hover:brightness-110 transition-all flex items-center gap-1.5 font-bold font-display"
              >
                <span>✨</span> AI Magic
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {task.subtasks.map(st => (
              <div 
                key={st.id} 
                onClick={(e) => { e.stopPropagation(); onToggleSubtask?.(task.id, st.id); }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${st.completed ? 'bg-emerald-50/30 border-emerald-100/50 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-primary/20'}`}
              >
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${st.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
                  {st.completed && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className={`text-[13px] font-medium flex-1 transition-all ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                  {st.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 font-bold tracking-tight uppercase group-hover:bg-primary-soft group-hover:text-primary transition-colors font-display">
          {task.category}
        </span>
        {task.status === Status.DONE ? (
          <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 font-display uppercase italic tracking-tighter">
            <span>✨</span> Success
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {urgency === 'due-today' && <span className="text-[9px] font-black text-orange-500 uppercase tracking-tighter animate-pulse font-display">Urgent</span>}
            <span className="text-[9px] font-bold text-slate-400 opacity-60 font-display">#{task.id.slice(0, 4)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
