
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Task, Status, Priority } from '../types';
import { PRIORITY_COLORS } from '../constants';

interface DashboardProps {
  tasks: Task[];
}

const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(null);

  // Use CSS variable value for charts
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--p-color').trim() || '#6366f1';
  const COLORS = [primaryColor, '#f59e0b', '#10b981', '#ef4444'];

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === Status.DONE).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const highPriority = tasks.filter(t => t.priority === Priority.HIGH && t.status !== Status.DONE).length;
    
    return { total, done, completionRate, highPriority };
  }, [tasks]);

  const statusData = useMemo(() => {
    return Object.values(Status).map(status => ({
      name: status,
      value: tasks.filter(t => t.status === status).length
    }));
  }, [tasks]);

  const priorityData = useMemo(() => {
    return Object.values(Priority).map(p => ({
      name: p,
      count: tasks.filter(t => t.priority === p).length
    }));
  }, [tasks]);

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate === dateStr && t.status !== Status.DONE);
  };

  const filteredUpcomingTasks = useMemo(() => {
    if (selectedDayOffset === null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      return tasks
        .filter(t => {
          if (t.status === Status.DONE) return false;
          const dueDate = new Date(t.dueDate);
          return dueDate >= today && dueDate <= sevenDaysLater;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } else {
      const targetDate = next7Days[selectedDayOffset];
      return getTasksForDate(targetDate);
    }
  }, [tasks, selectedDayOffset, next7Days]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 font-display uppercase tracking-wider">Tổng việc</p>
          <h2 className="text-xl md:text-3xl font-black">{stats.total}</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 font-display uppercase tracking-wider">Hoàn thành</p>
          <h2 className="text-xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.done}</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 font-display uppercase tracking-wider">Tỷ lệ %</p>
          <h2 className="text-xl md:text-3xl font-black text-primary">{stats.completionRate}%</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 font-display uppercase tracking-wider">Ưu tiên cao</p>
          <h2 className="text-xl md:text-3xl font-black text-red-600 dark:text-red-400">{stats.highPriority}</h2>
        </div>
      </div>

      {/* Mini Calendar Strip Widget */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm md:text-lg font-black font-display uppercase tracking-tight">Lịch trình 7 ngày tới</h3>
          <button 
            onClick={() => setSelectedDayOffset(null)}
            className={`text-[10px] font-black px-3 py-1 rounded-full transition-all font-display uppercase ${selectedDayOffset === null ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}
          >
            Tất cả
          </button>
        </div>
        <div className="flex gap-2 md:gap-4 overflow-x-auto custom-scrollbar pb-2">
          {next7Days.map((date, idx) => {
            const isSelected = selectedDayOffset === idx;
            const dayTasks = getTasksForDate(date);
            const isToday = idx === 0;
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            
            return (
              <button
                key={idx}
                onClick={() => setSelectedDayOffset(idx)}
                className={`flex-1 min-w-[60px] md:min-w-[80px] p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 group relative ${
                  isSelected 
                    ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-105 z-10' 
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 hover:border-primary/30'
                }`}
              >
                <span className={`text-[10px] font-black font-display uppercase tracking-tighter ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {isToday ? 'Nay' : dayNames[date.getDay()]}
                </span>
                <span className={`text-lg md:text-xl font-black font-display ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                  {date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <div className={`mt-1 flex gap-0.5`}>
                    {dayTasks.slice(0, 3).map((_, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                    ))}
                    {dayTasks.length > 3 && <span className={`text-[8px] font-bold ${isSelected ? 'text-white' : 'text-primary'}`}>+</span>}
                  </div>
                )}
                {isToday && !isSelected && (
                  <div className="absolute -top-1 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm h-72 md:h-80 transition-colors">
          <h3 className="text-sm md:text-lg font-bold mb-4 font-display">Tỷ lệ trạng thái</h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm h-72 md:h-80 transition-colors">
          <h3 className="text-sm md:text-lg font-bold mb-4 font-display">Mức độ ưu tiên</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="count" fill={primaryColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Upcoming Tasks List */}
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm lg:h-80 flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm md:text-lg font-bold font-display">
              {selectedDayOffset === null ? 'Sắp tới' : `Việc ngày ${next7Days[selectedDayOffset].getDate()}/${next7Days[selectedDayOffset].getMonth() + 1}`}
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary-soft text-primary uppercase font-display">
              {filteredUpcomingTasks.length} nhiệm vụ
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {filteredUpcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 py-8">
                <span className="text-3xl mb-2">🎉</span>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tight font-display">Thảnh thơi rồi!</p>
              </div>
            ) : (
              filteredUpcomingTasks.map(task => {
                const isToday = new Date(task.dueDate).toDateString() === new Date().toDateString();
                return (
                  <div key={task.id} className="group p-3 rounded-xl border border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter font-display ${isToday ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                        {isToday ? 'Hôm nay' : task.dueDate.split('-').slice(1).reverse().join('/')}
                      </span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border font-display ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mb-1">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${task.subtasks.length > 0 ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                        {task.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
