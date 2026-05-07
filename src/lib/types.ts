export type UserRole = "admin" | "employee" | "stagiaire" | "comptable";
export type UserGender = "male" | "female";
export type VerificationMethod = "email";

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

export type TaskStatus = "todo" | "in_progress" | "done" | "overdue" | "declined";
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
  assignedToId?: string | null;
  assignedRole?: UserRole;
  createdBy?: Partial<User> | string;
  tags?: string[];
  estimatedMinutes?: number;
  estimatedDurationMinutes?: number;
  actualMinutes?: number;
  priorityScore?: number;
  delayDays?: number;
  plannedStartAt?: string;
  startTime?: string;
  endTime?: string;
  actualStartedAt?: string;
  actualFinishedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  lateReason?: string;
  completedBy?: Partial<User> | string;
  completedAt?: string;
  isDelayed?: boolean;
  aiRecommendation?: {
    shouldRescheduleToday: boolean;
    recommendation: string;
    priority: "low" | "medium" | "high";
  };
  comments?: Array<{
    _id?: string;
    userId?: Partial<User> | string;
    message: string;
    createdAt?: string;
  }>;
  createdAt?: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "very_late" | "on_time";
export type CheckOutStatus = "on_time" | "early" | "very_early";

export interface Attendance {
  _id?: string;
  id?: string;
  userId?: Partial<User> | string;
  userSnapshot?: Partial<User>;
  date: string;
  dateKey: string;
  checkIn: string;
  checkOut?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: AttendanceStatus;
  checkOutStatus?: CheckOutStatus;
  delayMinutes: number;
  reason?: string;
  checkOutReason?: string;
  createdAt?: string;
}

export interface PresenceCalendarDay {
  date: string;
  present: number;
  absent: number;
  late: number;
  veryLate: number;
  totalUsers: number;
}

export interface PresenceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  avgDelay: number;
}

export interface PresenceCalendarResponse {
  days: PresenceCalendarDay[];
  stats: PresenceStats;
  month: number;
  year: number;
}

export interface PresenceDetailResponse {
  date: string;
  records: Attendance[];
  stats: PresenceStats;
}

export interface Notification {
  _id?: string;
  id?: string;
  type: "info" | "warning" | "danger" | "success" | "ml";
  title: string;
  message: string;
  isRead: boolean;
  source?: string;
  redirectTarget?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
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
  budgetLimit?: number;
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

export interface WeeklyRecommendationUserScore {
  userId?: string;
  name: string;
  email?: string;
  role?: UserRole | string;
  score: number;
  completedTasks?: number;
  activeTasks?: number;
  delayedTasks?: number;
  presentDays?: number;
  lateDays?: number;
  avgActivityScore?: number;
  completionRate?: number;
  punctualityRate?: number;
}

export interface WeeklyRecommendation {
  _id?: string;
  tenantId?: string | null;
  kind?: "weekly_effectiveness";
  weekKey?: string;
  generatedBy?: string;
  windowStart: string;
  windowEnd: string;
  summary: string;
  recommendations: string[];
  score?: number | null;
  effectiveUser?: WeeklyRecommendationUserScore;
  meta?: {
    averageScore?: number;
    userScores?: WeeklyRecommendationUserScore[];
    delayedUsers?: WeeklyRecommendationUserScore[];
    generatedAtRule?: string;
    source?: string;
    weekKey?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
}

export interface InsightKpi {
  key: string;
  label: string;
  value: number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  status?: "good" | "warning" | "critical" | "neutral";
  description?: string;
}

export interface InsightAnalysisItem {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metric?: string;
}

export interface InsightRecommendation {
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  source?: string;
}

export interface InsightSnapshot {
  _id?: string;
  tenantId?: string | null;
  generatedBy?: string;
  generatedForRole?: string;
  windowStart: string;
  windowEnd: string;
  kpis: InsightKpi[];
  analysis: InsightAnalysisItem[];
  recommendations: InsightRecommendation[];
  summary: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
}

export interface MlInsights {
  latestPrediction?: {
    riskScore?: number;
    riskLevel?: "low" | "medium" | "high";
    output?: Record<string, unknown>;
  };
  latestRecommendation?: MlRecommendation;
  anomalies?: Array<{
    _id?: string;
    isAnomaly?: boolean;
    riskScore?: number;
    output?: Record<string, unknown>;
    createdAt?: string;
  }>;
}

export interface AnalyticsActivityPoint {
  date: string;
  score?: number;
  tasksCompleted?: number;
  activeMinutes?: number;
}

export interface AnalyticsScore {
  current: number;
  trend: "up" | "down" | "stable";
  trendPct: number | string;
  history: Array<{
    date?: string;
    score?: number;
    tasksCompleted?: number;
    activeMinutes?: number;
  }>;
}

export interface FinanceSummary {
  totalIncome?: number;
  totalExpense?: number;
  balance?: number;
  anomalyCount?: number;
  byMonth?: DashboardChartPoint[];
  byCategory?: Array<{
    category: string;
    total: number;
    budget?: number | null;
    overBudget?: boolean;
  }>;
  recentAnomalies?: FinancialRecord[];
}

export interface FinanceReport {
  generatedAt?: string;
  period?: {
    startDate?: string | null;
    endDate?: string | null;
  };
  summary: FinanceSummary;
  totalRecords: number;
  topCategory?: {
    category: string;
    total: number;
    budget?: number | null;
    overBudget?: boolean;
  } | null;
  anomalyRate: number;
  records: FinancialRecord[];
}

export type RuleMetric =
  | "task.delayDays"
  | "task.priorityScore"
  | "task.status"
  | "finance.expensesThisMonth"
  | "finance.balanceThisMonth"
  | "finance.recordAmount";

export type RuleOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "in" | "contains";

export interface RuleCondition {
  metric: RuleMetric;
  operator: RuleOperator;
  value: string | number | string[];
}

export interface RuleAction {
  type: "notify";
  target: "currentUser" | "assignedUser" | "creator" | "tenantAdmins";
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  redirectTarget?: string;
  actionUrl?: string;
}

export interface Rule {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  trigger: "scheduled" | "task" | "finance" | "manual";
  resource: "task" | "finance" | "stagiaire";
  roles?: string[];
  conditions: RuleCondition[];
  action: RuleAction;
  redirectTarget?: string;
  isActive?: boolean;
  cooldownMinutes?: number;
  lastTriggeredAt?: string;
  createdAt?: string;
}

export interface QueryHookOptions {
  query?: {
    enabled?: boolean;
    refetchInterval?: number;
  };
}

export interface TaskQueryParams {
  status?: TaskStatus | "all";
  role?: UserRole | "all";
  userId?: string;
  assignedTo?: string;
  limit?: number;
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
  assignedTo?: string;
  startTime?: string;
  estimatedDuration?: number;
  estimatedDurationMinutes?: number;
  estimatedMinutes?: number;
}
