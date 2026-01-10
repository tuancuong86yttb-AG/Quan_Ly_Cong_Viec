
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, Priority, Status } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS } from '../constants';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onCycleStatus?: (id: string) => void;
  onDragStartGlobal?: () => void;
  onDragEndGlobal?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onCycleStatus, onDragStartGlobal, onDragEndGlobal }) => {
  const [isShaking, setIsShaking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const prevStatusRef = useRef<Status>(task.status);

  useEffect(() => {
    // Chỉ kích hoạt hoạt ảnh nếu trạng thái thay đổi từ khác DONE sang DONE
    if (task.status === Status.DONE && prevStatusRef.current !== Status.DONE) {
      setIsCelebrating(true);
      const timer = setTimeout(() => setIsCelebrating(false), 600);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = task.status;
  }, [task.status]);

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;

  // Tính toán độ khẩn cấp (trong vòng 24h hoặc đã quá hạn)
  const urgency = useMemo(() => {
    if (task.status === Status.DONE) return 'none';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (dueDate < today) return 'overdue'; // Đã quá hạn
    if (diffDays === 0) return 'due-today'; // Hết hạn trong hôm nay (trong vòng 24h)
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
      setTimeout(() => {
        onDelete(task.id);
      }, 400);
    }
  };

  const getDateStatusStyles = (dateStr: string) => {
    if (task.status === Status.DONE) {
      return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
    }

    switch (urgency) {
      case 'overdue':
        return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800 ring-1 ring-red-500/20';
      case 'due-today':
        return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800 animate-pulse ring-1 ring-orange-500/20';
      default:
        return 'bg-primary-soft text-primary border-primary/20 dark:border-primary/30';
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group cursor-grab active:cursor-grabbing relative overflow-hidden ${isShaking ? 'animate-shake' : ''} ${isDeleting ? 'animate-pop-out' : ''} ${isCelebrating ? 'animate-celebrate z-10' : ''}`}
    >
      {isCelebrating && (
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none flex items-center justify-center">
          <span className="text-4xl animate-bounce">🎊</span>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          <button 
            onClick={handleCycleClick}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border transition-all active:scale-90 ${
              task.status === Status.DONE ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20' :
              task.status === Status.IN_PROGRESS ? 'bg-primary-soft text-primary border-primary/20 dark:bg-primary/20' :
              'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800'
            }`}
          >
            {task.status} 🔄
          </button>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded transition-colors" title="Chỉnh sửa">✏️</button>
          <button onClick={handleDeleteClick} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded transition-colors" title="Xóa">🗑️</button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <h3 className={`font-bold leading-tight group-hover:text-primary transition-colors text-sm ${task.status === Status.DONE ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
          {task.title}
        </h3>
        {(urgency === 'due-today' || urgency === 'overdue') && (
          <span className="flex items-center" title={urgency === 'overdue' ? 'Đã quá hạn!' : 'Hết hạn trong hôm nay!'}>
            <span className="text-xs animate-bounce">🔥</span>
          </span>
        )}
      </div>
      
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold mb-3 transition-colors ${getDateStatusStyles(task.dueDate)}`}>
        <span className="text-xs">{urgency === 'overdue' ? '⚠️' : urgency === 'due-today' ? '⏰' : '📅'}</span>
        <span>
          {urgency === 'overdue' ? 'Quá hạn: ' : urgency === 'due-today' ? 'Sắp hết hạn: ' : 'Hạn chót: '}
          {task.dueDate}
        </span>
      </div>

      <p className={`text-xs mb-3 line-clamp-2 ${task.status === Status.DONE ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{task.description}</p>
      
      {task.subtasks.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-medium">
            <span>Tiến độ công việc con</span>
            <span>{completedSubtasks}/{task.subtasks.length}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(var(--p-color-rgb),0.3)] ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold tracking-tight group-hover:bg-primary-soft group-hover:text-primary transition-colors uppercase">
          {task.category}
        </span>
        {task.status === Status.DONE ? (
          <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
            <span>✨</span> Hoàn thành
          </span>
        ) : (
          <>
            {urgency === 'due-today' && (
              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter animate-pulse">Khẩn cấp</span>
            )}
            {progress === 100 && (
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">Xong 100%</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
