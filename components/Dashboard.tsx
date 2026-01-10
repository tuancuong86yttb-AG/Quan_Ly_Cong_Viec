
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Task, Status, Priority } from '../types';

interface DashboardProps {
  tasks: Task[];
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
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

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === Status.DONE).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const highPriority = tasks.filter(t => t.priority === Priority.HIGH && t.status !== Status.DONE).length;
    
    return { total, done, completionRate, highPriority };
  }, [tasks]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400">Tổng việc</p>
          <h2 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400">Hoàn thành</p>
          <h2 className="text-xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.done}</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400">Tỷ lệ %</p>
          <h2 className="text-xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.completionRate}%</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400">Ưu tiên cao</p>
          <h2 className="text-xl md:text-3xl font-bold text-red-600 dark:text-red-400">{stats.highPriority}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm h-72 md:h-80 transition-colors">
          <h3 className="text-sm md:text-lg font-semibold mb-4 md:mb-6 dark:text-slate-100">Trạng thái</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="40%"
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

        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm h-72 md:h-80 transition-colors">
          <h3 className="text-sm md:text-lg font-semibold mb-4 md:mb-6 dark:text-slate-100">Ưu tiên</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
