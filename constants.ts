
import { Priority, Status } from './types';

export const CATEGORIES = ['Công việc', 'Cá nhân', 'Mua sắm', 'Sức khỏe', 'Tài chính', 'Khác'];

export const PRIORITY_COLORS = {
  [Priority.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [Priority.HIGH]: 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_COLORS = {
  [Status.TODO]: 'bg-slate-100 text-slate-800',
  [Status.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
  [Status.DONE]: 'bg-emerald-100 text-emerald-800',
};
