
import React, { useState, useMemo } from 'react';
import { Task, Status, Priority } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEditTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Fill leading empty slots
    const firstDayIndex = date.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        day: prevMonthLastDay - i + 1,
        month: month - 1,
        year,
        currentMonth: false
      });
    }

    // Current month days
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push({
        day: i,
        month,
        year,
        currentMonth: true
      });
    }

    // Trailing empty slots to fill 6 rows (42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year,
        currentMonth: false
      });
    }

    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getTasksForDay = (day: number, month: number, year: number) => {
    const targetDate = new Date(year, month, day).toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate === targetDate);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.HIGH: return 'bg-red-500';
      case Priority.MEDIUM: return 'bg-yellow-500';
      case Priority.LOW: return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Calendar Header */}
      <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">{monthName}</h2>
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Hôm nay</button>
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-700">◀</button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">▶</button>
          </div>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 overflow-y-auto custom-scrollbar">
        {daysInMonth.map((dayObj, i) => {
          const dayTasks = getTasksForDay(dayObj.day, dayObj.month, dayObj.year);
          const isToday = new Date().toDateString() === new Date(dayObj.year, dayObj.month, dayObj.day).toDateString();
          
          return (
            <div 
              key={i} 
              className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-r border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1 transition-colors ${
                dayObj.currentMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20 opacity-40'
              } ${isToday ? 'ring-2 ring-inset ring-indigo-500/20' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                  isToday 
                    ? 'bg-indigo-600 text-white' 
                    : dayObj.currentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'
                }`}>
                  {dayObj.day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 px-1">
                    {dayTasks.length} việc
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[100px]">
                {dayTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className={`text-left px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium truncate transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 ${
                      task.status === Status.DONE 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 opacity-60 line-through' 
                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityColor(task.priority)}`} />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
