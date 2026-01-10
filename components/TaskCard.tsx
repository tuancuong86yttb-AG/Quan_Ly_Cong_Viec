
import React, { useState } from 'react';
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

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);

    if (task.status === Status.DONE) {
      return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
    }

    if (dueDate < today) {
      return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    } else if (dueDate.getTime() === today.getTime()) {
      return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
    }
    return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800';
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group cursor-grab active:cursor-grabbing relative overflow-hidden ${isShaking ? 'animate-shake' : ''} ${isDeleting ? 'animate-pop-out' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {/* Quick status cycle button */}
          <button 
            onClick={handleCycleClick}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border transition-all active:scale-90 ${
              task.status === Status.DONE ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20' :
              task.status === Status.IN_PROGRESS ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20' :
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
      
      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{task.title}</h3>
      
      {/* Prominent Due Date Badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold mb-3 transition-colors ${getDateStatusStyles(task.dueDate)}`}>
        <span className="text-xs">📅</span>
        <span>Hạn chót: {task.dueDate}</span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      
      {task.subtasks.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-medium">
            <span>Tiến độ công việc con</span>
            <span>{completedSubtasks}/{task.subtasks.length}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(99,102,241,0.3)] ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold tracking-tight group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors uppercase">
          {task.category}
        </span>
        {progress === 100 && task.status !== Status.DONE && (
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">Sẵn sàng hoàn thành!</span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
