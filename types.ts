
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

export type ViewType = 'board' | 'list' | 'dashboard';
export type Theme = 'light' | 'dark';
