export type UserRole = "student" | "employee" | "accountant" | "intern" | "admin";
export type UserGender = "male" | "female";
export type VerificationMethod = "email" | "sms" | "whatsapp";

export interface User {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  role: UserRole;
  profileType: UserRole;
  verificationMethod?: VerificationMethod;
  gender: UserGender;
  tenantId?: string;
  avatar?: string;
  isVerified: boolean;
  isPublic?: boolean;
  createdAt?: string;
  preferences?: {
    theme?: string;
    emailNotifications?: boolean;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SendCodeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  verificationMethod: VerificationMethod;
  role: UserRole;
  gender: UserGender;
}

export interface VerifyCodeRequest {
  email: string;
  phoneNumber?: string;
  code: string;
}

export interface RegisterRequest extends SendCodeRequest {
  password: string;
  confirmPassword: string;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assignedTo?: Partial<User> | string;
  createdBy?: Partial<User> | string;
  tags?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  createdAt?: string;
}

export interface Notification {
  _id?: string;
  id?: string;
  type: "info" | "warning" | "danger" | "success" | "ml";
  title: string;
  message: string;
  isRead: boolean;
  source?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface FinancialRecord {
  _id?: string;
  id?: string;
  clientName?: string;
  type: "income" | "expense";
  amount: number;
  category?: string;
  description?: string;
  date: string;
  isAnomaly?: boolean;
  anomalyScore?: number;
}

export interface DashboardChartPoint {
  day?: string;
  month?: string;
  value?: number;
  income?: number;
  expense?: number;
}

export interface DashboardStats {
  teamSize?: number;
  activeProjects?: number;
  currentScore?: number;
  anomaliesDetected?: number;
  completedTasks?: number;
  overdueTasks?: number;
  streak?: number;
  balance?: number;
  anomalyCount?: number;
  weeklyActivity?: DashboardChartPoint[];
  byMonth?: DashboardChartPoint[];
}

export interface TeamMemberSummary {
  member: Partial<User> & {
    _id?: string;
    id?: string;
    role?: UserRole;
    email?: string;
    isActive?: boolean;
  };
  avgScore?: number;
  tasksCompleted?: number;
}

export interface MlRecommendation {
  confidence?: number;
  recommendations?: string[];
}

export interface MlInsights {
  latestRecommendation?: MlRecommendation;
}

export interface FinanceSummary {
  balance?: number;
  anomalyCount?: number;
  byMonth?: DashboardChartPoint[];
}

export interface QueryHookOptions {
  query?: {
    enabled?: boolean;
    refetchInterval?: number;
  };
}

export interface UpdateTaskInput {
  id: string;
  data: Partial<Task>;
}

export interface CreateTaskInput {
  title: string;
  status?: TaskStatus;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}
