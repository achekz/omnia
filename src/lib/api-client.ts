// Role du fichier: centralise les appels API et hooks React Query.
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyticsActivityPoint,
  AnalyticsScore,
  Attendance,
  CreateTaskInput,
  DashboardStats,
  FinanceReport,
  FinanceSummary,
  FinancialRecord,
  InsightSnapshot,
  MlInsights,
  Notification,
  PresenceCalendarResponse,
  PresenceDetailResponse,
  QueryHookOptions,
  Rule,
  Task,
  TaskQueryParams,
  TaskStats,
  TaskUserSummary,
  TeamMemberSummary,
  UpdateTaskInput,
  User,
  WeeklyRecommendation,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_STORAGE_KEY = "token";
const REFRESH_TOKEN_STORAGE_KEY = "refreshToken";
const USER_STORAGE_KEY = "user";
const LEGACY_TOKEN_STORAGE_KEY = "omni_ai_token";
const LEGACY_REFRESH_TOKEN_STORAGE_KEY = "omni_ai_refreshToken";
const LEGACY_USER_STORAGE_KEY = "omni_ai_user";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshAccessTokenPromise: Promise<string> | null = null;

const PUBLIC_API_PATHS = new Set([
  "/auth/send-code",
  "/auth/verify-code",
  "/auth/register",
  "/auth/login",
  "/auth/admin-login",
  "/auth/repair",
  "/auth/debug-login",
  "/auth/forgot-password",
  "/auth/verify-reset-code",
  "/auth/reset-password",
  "/auth/refresh-token",
  "/auth/test-email",
]);

function isPublicApiRequest(url = "") {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return PUBLIC_API_PATHS.has(path.replace(/^\/api(?=\/)/, ""));
  } catch {
    return PUBLIC_API_PATHS.has(url.replace(/^\/api(?=\/)/, ""));
  }
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
}

function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);
}

function isJwtExpired(token?: string | null) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const expiresAt = Number(payload.exp || 0) * 1000;
    return !expiresAt || expiresAt <= Date.now() + 15000;
  } catch {
    return true;
  }
}

async function refreshAccessToken() {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async () => {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
      const newToken = res.data?.data?.accessToken as string | undefined;
      if (!newToken) throw new Error("Invalid refresh response");

      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      localStorage.setItem(LEGACY_TOKEN_STORAGE_KEY, newToken);
      return newToken;
    })().finally(() => {
      refreshAccessTokenPromise = null;
    });
  }

  return refreshAccessTokenPromise;
}

apiClient.interceptors.request.use(
  async (config) => {
    let token = getStoredToken();

    if (token && isJwtExpired(token) && getStoredRefreshToken() && !isPublicApiRequest(config.url)) {
      try {
        token = await refreshAccessToken();
      } catch {
        clearStoredAuth();
        window.location.href = "/login";
        return Promise.reject(new axios.CanceledError("Authentication refresh failed"));
      }
    }

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isPublicApiRequest(config.url)) {
      return Promise.reject(new axios.CanceledError("Authentication token missing"));
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean; headers?: Record<string, string> };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch {
        clearStoredAuth();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

const fallbackNotifications: Notification[] = [];

const fallbackTasks: Task[] = [
  {
    id: "task-1",
    title: "Review dashboard insights",
    status: "todo",
    priority: "medium",
    description: "Open the dashboard and review today’s AI recommendations.",
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "task-2",
    title: "Organize weekly priorities",
    status: "in_progress",
    priority: "high",
  },
  {
    id: "task-3",
    title: "Close completed items",
    status: "done",
    priority: "low",
  },
];

const fallbackDashboardStats: DashboardStats = {
  teamSize: 24,
  activeProjects: 8,
  currentScore: 92,
  anomaliesDetected: 3,
  completedTasks: 5,
  overdueTasks: 1,
  streak: 14,
  balance: 125000,
  anomalyCount: 2,
  weeklyActivity: [
    { day: "Mon", value: 72 },
    { day: "Tue", value: 78 },
    { day: "Wed", value: 81 },
    { day: "Thu", value: 86 },
    { day: "Fri", value: 91 },
  ],
  byMonth: [
    { month: "Jan", income: 32000, expense: 21000 },
    { month: "Feb", income: 35000, expense: 22500 },
    { month: "Mar", income: 41000, expense: 26000 },
    { month: "Apr", income: 47000, expense: 29000 },
  ],
};

const fallbackTeamMembers: TeamMemberSummary[] = [
  {
      member: {
        id: "member-1",
        name: "Sarra Ben Ali",
        role: "employee",
        email: "sarra@demo.com",
        isActive: true,
      },
    avgScore: 94,
    tasksCompleted: 18,
  },
  {
      member: {
        id: "member-2",
        name: "Youssef Hamdi",
        role: "comptable",
        email: "youssef@demo.com",
        isActive: true,
      },
    avgScore: 90,
    tasksCompleted: 15,
  },
];

const fallbackFinanceRecords: FinancialRecord[] = [
  {
    id: "finance-1",
    clientName: "Atlas SARL",
    type: "income",
    amount: 8200,
    category: "Consulting",
    description: "Monthly consulting retainer",
    date: new Date().toISOString(),
  },
  {
    id: "finance-2",
    clientName: "Nova Tech",
    type: "expense",
    amount: 1200,
    category: "Software",
    description: "License renewal",
    date: new Date().toISOString(),
    isAnomaly: true,
    anomalyScore: 91,
  },
];

const fallbackFinanceSummary: FinanceSummary = {
  balance: 125000,
  anomalyCount: 1,
  byMonth: fallbackDashboardStats.byMonth,
};

const fallbackFinanceReport: FinanceReport = {
  generatedAt: new Date().toISOString(),
  summary: fallbackFinanceSummary,
  totalRecords: fallbackFinanceRecords.length,
  topCategory: fallbackFinanceSummary.byCategory?.[0] || null,
  anomalyRate: fallbackFinanceRecords.length
    ? Math.round((fallbackFinanceRecords.filter((record) => record.isAnomaly).length / fallbackFinanceRecords.length) * 100)
    : 0,
  records: fallbackFinanceRecords,
};

const fallbackInsights: MlInsights = {
  latestPrediction: {
    riskScore: 0.28,
    riskLevel: "low",
  },
  latestRecommendation: {
    confidence: 88,
    recommendations: [
      "Batch similar tasks to reduce context switching.",
      "Prioritize high-impact items before midday.",
    ],
  },
  anomalies: [],
};

const fallbackAnalyticsActivity: AnalyticsActivityPoint[] = [];

const fallbackAnalyticsScore: AnalyticsScore = {
  current: 0,
  trend: "stable",
  trendPct: 0,
  history: [],
};

const fallbackRules: Rule[] = [];

type SendAttendanceCodeResponse = {
  action?: "check-in" | "check-out";
  emailSent?: boolean;
  devCode?: string;
  expiresAt?: string;
};

function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object") {
    const dataPayload = payload as { data?: T };
    if (dataPayload.data !== undefined) {
      return dataPayload.data;
    }

    return payload as T;
  }

  return fallback;
}

function unwrapCollection<T>(payload: unknown, collectionKey: string, fallback: T[]): T[] {
  if (payload && typeof payload === "object") {
    const rootPayload = payload as Record<string, unknown>;
    const nestedData =
      rootPayload.data && typeof rootPayload.data === "object"
        ? (rootPayload.data as Record<string, unknown>)
        : null;

    const candidate =
      (nestedData?.[collectionKey] as T[] | undefined) ??
      (rootPayload[collectionKey] as T[] | undefined);

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return fallback;
}

function unwrapEntity<T>(payload: unknown, entityKey: string, fallback: T): T {
  if (payload && typeof payload === "object") {
    const rootPayload = payload as Record<string, unknown>;
    const nestedData =
      rootPayload.data && typeof rootPayload.data === "object"
        ? (rootPayload.data as Record<string, unknown>)
        : null;

    const candidate =
      (nestedData?.[entityKey] as T | undefined) ??
      (rootPayload[entityKey] as T | undefined);

    if (candidate !== undefined) {
      return candidate;
    }
  }

  return unwrapData<T>(payload, fallback);
}

export function useGetNotifications(options?: QueryHookOptions) {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/notifications?limit=100");
        return unwrapCollection<Notification>(response.data, "notifications", fallbackNotifications);
      } catch {
        return fallbackNotifications;
      }
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: fallbackNotifications,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return unwrapEntity<Notification>(response.data, "notif", {} as Notification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch("/notifications/read-all");
      return unwrapData(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useClearReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete("/notifications/clear-all");
      return unwrapData(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGetDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/dashboard/stats");
        return { ...fallbackDashboardStats, ...unwrapData<DashboardStats>(response.data, fallbackDashboardStats) };
      } catch {
        return fallbackDashboardStats;
      }
    },
    initialData: fallbackDashboardStats,
  });
}

function cleanTaskParams(params?: TaskQueryParams) {
  const cleaned: Record<string, string | number> = {};
  if (!params) return cleaned;
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      cleaned[key] = value as string | number;
    }
  });
  return cleaned;
}

export function useGetTasks(options?: QueryHookOptions & { params?: TaskQueryParams }) {
  return useQuery<Task[]>({
    queryKey: ["tasks", options?.params || {}],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/tasks", { params: cleanTaskParams(options?.params) });
        return unwrapCollection<Task>(response.data, "tasks", []);
      } catch {
        return [];
      }
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: [],
  });
}

export function useGetAssignedTasks(options?: QueryHookOptions & { params?: TaskQueryParams }) {
  return useQuery<Task[]>({
    queryKey: ["assigned-tasks", options?.params || {}],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/tasks", { params: { limit: 100, ...cleanTaskParams(options?.params) } });
        return unwrapCollection<Task>(response.data, "tasks", []);
      } catch {
        return [];
      }
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: [],
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const response = await apiClient.post("/tasks", data);
      return unwrapEntity<Task>(response.data, "task", {
        id: crypto.randomUUID(),
        title: data.title,
        status: data.status ?? "todo",
        description: data.description,
        priority: data.priority ?? "medium",
        dueDate: data.dueDate,
      });
    },
    onSuccess: (createdTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (current = fallbackTasks) => [createdTask, ...current]);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateTaskInput) => {
      const response = await apiClient.put(`/tasks/${id}`, data);
      return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status: "todo", ...data });
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (current = fallbackTasks) =>
        current.map((task) => {
          const taskId = task._id ?? task.id;
          const updatedId = updatedTask._id ?? updatedTask.id;
          return taskId === updatedId ? { ...task, ...updatedTask } : task;
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-task-details"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, declineReason, lateReason, progress }: { id: string; status: Task["status"]; declineReason?: string; lateReason?: string; progress?: number }) => {
      const response = await apiClient.patch(`/tasks/${id}/status`, { status, declineReason, lateReason, progress });
      return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
    },
  });
}

export function useGetTaskDetails(id?: string, options?: QueryHookOptions) {
  return useQuery<Task | null>({
    queryKey: ["task-details", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get(`/tasks/${id}`);
      return unwrapEntity<Task | null>(response.data, "task", null);
    },
    enabled: Boolean(id) && (options?.query?.enabled ?? true),
    refetchInterval: options?.query?.refetchInterval,
    initialData: null,
  });
}

export function useRescheduleTaskToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status = "in_progress" }: { id: string; status?: "todo" | "in_progress" }) => {
      const response = await apiClient.put(`/tasks/${id}/reschedule`, { status });
      return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status });
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-details", task._id || task.id] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const response = await apiClient.post(`/tasks/${id}/comments`, { message });
      return unwrapEntity<Task>(response.data, "task", {} as Task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-task-details"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAcceptAssignedTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/tasks/${id}/accept`);
      return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status: "in_progress" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useSendAssignedTaskLater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, declineReason = "Plus tard" }: { id: string; declineReason?: string }) => {
      const response = await apiClient.patch(`/tasks/${id}/later`, { declineReason });
      return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status: "declined", declineReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useGetTaskUsers(params?: { role?: string }, options?: QueryHookOptions) {
  return useQuery<TaskUserSummary[]>({
    queryKey: ["task-users", params?.role || "all"],
    queryFn: async () => {
      const response = await apiClient.get("/tasks/users", { params: params?.role && params.role !== "all" ? params : {} });
      return unwrapCollection<TaskUserSummary>(response.data, "users", []);
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: [],
  });
}

export function useGetUserTasks(userId?: string, params?: { status?: string; priority?: string; deadline?: string }, options?: QueryHookOptions) {
  return useQuery<{ user: User | null; tasks: Task[]; stats: TaskStats | null }>({
    queryKey: ["user-tasks", userId, params || {}],
    queryFn: async () => {
      if (!userId) return { user: null, tasks: [], stats: null };
      const response = await apiClient.get(`/tasks/user/${userId}`, { params });
      return unwrapData(response.data, { user: null, tasks: [], stats: null });
    },
    enabled: Boolean(userId) && (options?.query?.enabled ?? true),
    refetchInterval: options?.query?.refetchInterval,
    initialData: { user: null, tasks: [], stats: null },
  });
}

export function useGetMyAttendance(month: number, year: number, options?: QueryHookOptions) {
  return useQuery<{ records: Attendance[]; today: Attendance | null; serverTime?: string }>({
    queryKey: ["attendance", month, year],
    queryFn: async () => {
      const response = await apiClient.get(`/presence/me?month=${month}&year=${year}`);
      return unwrapData(response.data, { records: [], today: null });
    },
    enabled: options?.query?.enabled ?? true,
    initialData: { records: [], today: null },
  });
}

export function useSendAttendanceCode() {
  return useMutation({
    mutationFn: async (data: { action: "check-in" | "check-out"; reason?: string }) => {
      const response = await apiClient.post("/presence/send-code", data);
      return unwrapData<SendAttendanceCodeResponse>(response.data, {});
    },
  });
}

export function useConfirmAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { action: "check-in" | "check-out"; code: string; reason?: string }) => {
      const response = await apiClient.post("/presence/confirm", data);
      return unwrapEntity<Attendance>(response.data, "attendance", {} as Attendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["admin-presences"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGetAdminUsers(options?: QueryHookOptions) {
  return useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/users");
      return unwrapCollection<User>(response.data, "users", []);
    },
    enabled: options?.query?.enabled ?? true,
    initialData: [],
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/admin/users/${id}`);
      return unwrapData(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useGetAdminUserTaskDetails(id?: string, options?: QueryHookOptions) {
  return useQuery<{ user: User | null; tasks: Task[] }>({
    queryKey: ["admin-user-task-details", id],
    queryFn: async () => {
      if (!id) return { user: null, tasks: [] };
      const response = await apiClient.get(`/admin/users/${id}/tasks`);
      return unwrapData(response.data, { user: null, tasks: [] });
    },
    enabled: Boolean(id) && (options?.query?.enabled ?? true),
    refetchInterval: options?.query?.refetchInterval,
    initialData: { user: null, tasks: [] },
  });
}

export function useGetAdminPresences(options?: QueryHookOptions) {
  return useQuery<Attendance[]>({
    queryKey: ["admin-presences"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/presences");
      return unwrapCollection<Attendance>(response.data, "records", []);
    },
    enabled: options?.query?.enabled ?? true,
    initialData: [],
  });
}

export function useGetPresenceCalendar(params: { month: number; year: number; role?: string }, options?: QueryHookOptions) {
  return useQuery<PresenceCalendarResponse>({
    queryKey: ["presence-calendar", params.month, params.year, params.role || "all"],
    queryFn: async () => {
      const response = await apiClient.get("/presences/calendar", { params });
      return unwrapData<PresenceCalendarResponse>(response.data, {
        days: [],
        stats: { totalPresent: 0, totalAbsent: 0, totalLate: 0, avgDelay: 0 },
        month: params.month,
        year: params.year,
      });
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: {
      days: [],
      stats: { totalPresent: 0, totalAbsent: 0, totalLate: 0, avgDelay: 0 },
      month: params.month,
      year: params.year,
    },
  });
}

export function useGetPresenceDay(date?: string, params?: { role?: string; status?: string }, options?: QueryHookOptions) {
  return useQuery<PresenceDetailResponse>({
    queryKey: ["presence-day", date, params?.role || "all", params?.status || "all"],
    queryFn: async () => {
      if (!date) {
        return { date: "", records: [], stats: { totalPresent: 0, totalAbsent: 0, totalLate: 0, avgDelay: 0 } };
      }
      const response = await apiClient.get(`/presences/${date}`, { params });
      return unwrapData<PresenceDetailResponse>(response.data, {
        date,
        records: [],
        stats: { totalPresent: 0, totalAbsent: 0, totalLate: 0, avgDelay: 0 },
      });
    },
    enabled: Boolean(date) && (options?.query?.enabled ?? true),
    refetchInterval: options?.query?.refetchInterval,
    initialData: {
      date: date || "",
      records: [],
      stats: { totalPresent: 0, totalAbsent: 0, totalLate: 0, avgDelay: 0 },
    },
  });
}

export function useGetAdminTasks(options?: QueryHookOptions & { params?: TaskQueryParams }) {
  return useQuery<Task[]>({
    queryKey: ["admin-tasks", options?.params || {}],
    queryFn: async () => {
      const response = await apiClient.get("/tasks", { params: { limit: 500, ...cleanTaskParams(options?.params) } });
      return unwrapCollection<Task>(response.data, "tasks", []);
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: [],
  });
}

export function useMlInsights() {
  return useQuery<MlInsights>({
    queryKey: ["ml-insights"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/ml/insights");
        return { ...fallbackInsights, ...unwrapData<MlInsights>(response.data, fallbackInsights) };
      } catch {
        return fallbackInsights;
      }
    },
    initialData: fallbackInsights,
  });
}

export function useRunRiskPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/ml/predict-risk");
      return unwrapData(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/ml/recommend");
      return unwrapData(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
    },
  });
}

export function useGetWeeklyRecommendations(options?: QueryHookOptions) {
  return useQuery<WeeklyRecommendation[]>({
    queryKey: ["admin-weekly-recommendations"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/recommendations/weekly");
      return unwrapCollection<WeeklyRecommendation>(response.data, "records", []);
    },
    enabled: options?.query?.enabled ?? true,
    initialData: [],
  });
}

export function useGenerateWeeklyRecommendation() {
  const queryClient = useQueryClient();

  return useMutation<WeeklyRecommendation, unknown, boolean | undefined>({
    mutationFn: async (force = true) => {
      const response = await apiClient.post("/admin/recommendations/weekly/generate", { force });
      return unwrapEntity<WeeklyRecommendation>(response.data, "recommendation", {} as WeeklyRecommendation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
    },
  });
}

export function useDetectAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values?: number[]) => {
      const response = await apiClient.post("/ml/detect-anomaly", values ? { values } : {});
      return unwrapData(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGetInsightOverview(options?: QueryHookOptions) {
  return useQuery<InsightSnapshot | null>({
    queryKey: ["insight-overview"],
    queryFn: async () => {
      const response = await apiClient.get("/insights/overview");
      return unwrapEntity<InsightSnapshot | null>(response.data, "snapshot", null);
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: null,
  });
}

export function useGenerateInsightOverview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/insights/generate", { trigger: "manual-ui" });
      return unwrapEntity<InsightSnapshot>(response.data, "snapshot", {} as InsightSnapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insight-overview"] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
    },
  });
}

export function useGetAnalyticsActivity() {
  return useQuery<AnalyticsActivityPoint[]>({
    queryKey: ["analytics-activity"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/analytics/activity");
        return unwrapData<{ activity?: AnalyticsActivityPoint[] }>(response.data, { activity: fallbackAnalyticsActivity }).activity || fallbackAnalyticsActivity;
      } catch {
        return fallbackAnalyticsActivity;
      }
    },
    initialData: fallbackAnalyticsActivity,
  });
}

export function useGetAnalyticsScore() {
  return useQuery<AnalyticsScore>({
    queryKey: ["analytics-score"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/analytics/score");
        return { ...fallbackAnalyticsScore, ...unwrapData<AnalyticsScore>(response.data, fallbackAnalyticsScore) };
      } catch {
        return fallbackAnalyticsScore;
      }
    },
    initialData: fallbackAnalyticsScore,
  });
}

export function useGetRules() {
  return useQuery<Rule[]>({
    queryKey: ["rules"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/rules");
        return unwrapCollection<Rule>(response.data, "rules", fallbackRules);
      } catch {
        return fallbackRules;
      }
    },
    initialData: fallbackRules,
  });
}

export function useSaveRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Partial<Rule>) => {
      const payload = {
        ...rule,
        redirectTarget: rule.redirectTarget || rule.action?.redirectTarget || rule.action?.actionUrl,
        action: {
          ...rule.action,
          redirectTarget: rule.redirectTarget || rule.action?.redirectTarget || rule.action?.actionUrl,
          actionUrl: rule.redirectTarget || rule.action?.redirectTarget || rule.action?.actionUrl,
        },
        conditions: rule.conditions?.map((condition) => ({
          ...condition,
          value: typeof condition.value === "string" && !Number.isNaN(Number(condition.value)) ? Number(condition.value) : condition.value,
        })),
      };

      const id = rule._id || rule.id;
      const response = id ? await apiClient.put(`/rules/${id}`, payload) : await apiClient.post("/rules", payload);
      return unwrapEntity<Rule>(response.data, "rule", payload as Rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/rules/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export function useGetTeamMembers() {
  return useQuery<TeamMemberSummary[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/team/members");
        return unwrapData<TeamMemberSummary[]>(response.data, fallbackTeamMembers);
      } catch {
        return fallbackTeamMembers;
      }
    },
    initialData: fallbackTeamMembers,
  });
}

export function useGetFinanceSummary() {
  return useQuery<FinanceSummary>({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/finance/summary");
        return { ...fallbackFinanceSummary, ...unwrapData<FinanceSummary>(response.data, fallbackFinanceSummary) };
      } catch {
        return fallbackFinanceSummary;
      }
    },
    initialData: fallbackFinanceSummary,
  });
}

export function useGetFinanceRecords() {
  return useQuery<FinancialRecord[]>({
    queryKey: ["finance-records"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/finance/records");
        return unwrapCollection<FinancialRecord>(response.data, "records", fallbackFinanceRecords);
      } catch {
        return fallbackFinanceRecords;
      }
    },
    initialData: fallbackFinanceRecords,
  });
}

export function useCreateFinanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<FinancialRecord, "_id" | "id">) => {
      const response = await apiClient.post("/finance/records", data);
      return unwrapEntity<FinancialRecord>(response.data, "record", { ...data, id: crypto.randomUUID() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-records"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-report"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGetFinanceReport() {
  return useQuery<FinanceReport>({
    queryKey: ["finance-report"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/finance/reports");
        return { ...fallbackFinanceReport, ...unwrapData<FinanceReport>(response.data, fallbackFinanceReport) };
      } catch {
        return fallbackFinanceReport;
      }
    },
    initialData: fallbackFinanceReport,
  });
}

export function useExportFinanceReport() {
  return useMutation({
    mutationFn: async (format: "csv" | "json" = "csv") => {
      const response = await apiClient.get(`/finance/export?format=${format}`, {
        responseType: format === "csv" ? "blob" : "json",
      });

      if (format === "json") {
        const payload = JSON.stringify(unwrapData(response.data, response.data), null, 2);
        return { blob: new Blob([payload], { type: "application/json" }), filename: "finance-report.json" };
      }

      return { blob: response.data as Blob, filename: "finance-report.csv" };
    },
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

export default apiClient;
