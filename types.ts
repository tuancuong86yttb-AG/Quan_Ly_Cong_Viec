
export enum Priority {
  LOW = 'Thấp',
  MEDIUM = 'Trung bình',
  HIGH = 'Cao'
}

export enum Status {
  TODO = 'Cần làm',
  IN_PROGRESS = 'Đang thực hiện',
  DONE = 'Đã xong'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  subtasks: SubTask[];
  category: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface HistoryEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  action: 'create' | 'delete' | 'complete' | 'status_change';
  timestamp: string;
  details?: string;
}

export interface AppNotification {
  id: string;
  taskId: string;
  title: string;
  message: string;
  type: 'overdue' | 'due_soon' | 'system';
  timestamp: string;
  isRead: boolean;
}

export type ViewType = 'board' | 'list' | 'dashboard' | 'calendar' | 'history';
export type Theme = 'light' | 'dark';
