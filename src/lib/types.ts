// Shared Types across Full Stack
export interface User {
  _id: string; // From Mongo
  id?: string;
  email: string;
  name: string;
  profileType: 'company' | 'cabinet' | 'employee' | 'student';
  role: 'company_admin' | 'cabinet_admin' | 'manager' | 'employee' | 'student';
  tenantId?: string;
  avatar?: string;
  preferences?: { theme: string; emailNotifications: boolean };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  [key: string]: any;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  name?: string;
  [key: string]: any;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignedTo?: Partial<User> | string;
  createdBy?: Partial<User> | string;
  tags?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  createdAt?: string;
}

export interface Notification {
  _id: string;
  type: 'info' | 'warning' | 'danger' | 'success' | 'ml';
  title: string;
  message: string;
  isRead: boolean;
  source: string;
  actionUrl?: string;
  createdAt: string;
}

export interface FinancialRecord {
  _id: string;
  clientName?: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  description?: string;
  date: string;
  isAnomaly?: boolean;
  anomalyScore?: number;
}
