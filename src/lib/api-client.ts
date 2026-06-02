// Role du fichier: centralise les appels API et hooks React Query.
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyticsActivityPoint,
  AnalyticsScore,
  Attendance,
  CreateTaskInput,
  DashboardStats,
  InsightSnapshot,
  MlInsights,
  Notification,
  PresenceCalendarResponse,
  PresenceDetailResponse,
  QueryHookOptions,
  RoleChangeRequest,
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

function redactForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/(token|password|apiKey|key)=([^&\s]+)/gi, "$1=<redacted>").replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer <redacted>");
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactForLog);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      /(token|password|secret|authorization|cookie)/i.test(key) ? "<redacted>" : redactForLog(entry),
    ]),
  );
}

function logApiError(error: any) {
  if (
    error?.code === "ERR_CANCELED" ||
    error instanceof axios.CanceledError
  ) {
    return;
  }
  const method = String(error?.config?.method || "GET").toUpperCase();
  const url = error?.config?.baseURL && error?.config?.url && !String(error.config.url).startsWith("http")
    ? `${String(error.config.baseURL).replace(/\/$/, "")}/${String(error.config.url).replace(/^\//, "")}`
    : error?.config?.url;

  console.error("[API] Axios request failed", redactForLog({
    method,
    url,
    timeout: error?.config?.timeout,
    baseURL: error?.config?.baseURL,
    code: error?.code,
    message: error?.message,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    responseHeaders: error?.response?.headers,
    responseData: error?.response?.data,
    stack: error?.stack,
  }));
}

const VERIFICATION_REQUEST_TIMEOUT_MS = 60000;
export const ADMIN_DASHBOARD_TIMEOUT_MS = 60000;

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

      const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken }, { timeout: 10000 });
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

    if (
      token &&
      isJwtExpired(token) &&
      getStoredRefreshToken() &&
      !isPublicApiRequest(config.url)
    ) {
      try {
        token = await refreshAccessToken();
      } catch (error) {
        clearStoredAuth();
        return Promise.reject(error);
      }
    }

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isPublicApiRequest(config.url)) {
        if (window.location.pathname !== "/login") {
          if (import.meta.env.DEV) {
          console.log(
            "[AUTH] Request cancelled after logout:",
            config.url
          );
}
        }

      return Promise.reject(
        new axios.CanceledError("Authentication token missing")
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
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
      } catch (error) {
        logApiError(error);
        clearStoredAuth();
        window.location.href = "/login";
      }
    }

    logApiError(error);
    return Promise.reject(error);
  },
);

const fallbackNotifications: Notification[] = [];

const fallbackDashboardStats: DashboardStats = {
  teamSize: 24,
  activeProjects: 8,
  currentScore: 92,
  anomaliesDetected: 3,
  completedTasks: 5,
  overdueTasks: 1,
  streak: 14,
  weeklyActivity: [
    { day: "Mon", value: 72 },
    { day: "Tue", value: 78 },
    { day: "Wed", value: 81 },
    { day: "Thu", value: 86 },
    { day: "Fri", value: 91 },
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
  const token = getStoredToken();

  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/notifications?limit=100");
        return unwrapCollection<Notification>(
          response.data,
          "notifications",
          fallbackNotifications
        );
      } catch {
        return fallbackNotifications;
      }
    },
    enabled: (options?.query?.enabled ?? true) && !!token,
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
  const token = getStoredToken();

  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/dashboard/stats");

        return {
          ...fallbackDashboardStats,
          ...unwrapData<DashboardStats>(
            response.data,
            fallbackDashboardStats
          ),
        };
      } catch {
        return fallbackDashboardStats;
      }
    },
    enabled: !!token,
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
  const token = localStorage.getItem("token");

  return useQuery<Task[]>({
    queryKey: ["tasks", options?.params || {}],

    queryFn: async () => {
      const response = await apiClient.get("/tasks", {
        params: cleanTaskParams(options?.params),
      });

      return unwrapCollection<Task>(response.data, "tasks", []);
    },

    enabled: !!token && (options?.query?.enabled ?? true),

    refetchInterval: options?.query?.refetchInterval,
    initialData: [],
  });
}

export function useGetAssignedTasks(options?: QueryHookOptions & { params?: TaskQueryParams }) {
  return useQuery<Task[]>({
    queryKey: ["assigned-tasks", options?.params || {}],
    queryFn: async () => {
      const response = await apiClient.get("/tasks", { params: { limit: 100, ...cleanTaskParams(options?.params) } });
      return unwrapCollection<Task>(response.data, "tasks", []);
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
      queryClient.setQueryData<Task[]>(["tasks"], (current = []) => [createdTask, ...current]);
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
      queryClient.setQueryData<Task[]>(["tasks"], (current = []) =>
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
    mutationFn: async ({ id, status, declineReason, lateReason, progress, comment }: { id: string; status: Task["status"]; declineReason?: string; lateReason?: string; progress?: number; comment?: string }) => {
      const response = await apiClient.patch(`/tasks/${id}/status`, { status, declineReason, lateReason, progress, comment });
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

export function useGetTaskDetails(
  id?: string,
  options?: QueryHookOptions,
) {
  const token = localStorage.getItem("token");

  return useQuery<Task | null>({
    queryKey: ["task", id],

    enabled: !!token && !!id,

    queryFn: async () => {
      const response = await apiClient.get(`/tasks/${id}`);
      return unwrapEntity<Task | null>(response.data, "task", null);
    },

    ...options?.query,
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
      const response = await apiClient.post("/presence/send-code", data, {
        timeout: VERIFICATION_REQUEST_TIMEOUT_MS,
      });
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

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> & { password?: string; passwordCode?: string; emailCode?: string; adminPassword?: string } }) => {
      const response = await apiClient.put(`/admin/users/${id}`, data);
      return unwrapEntity<User>(response.data, "user", {} as User);
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-task-details", user._id || user.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-task-details"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSendAdminUserPasswordCode() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/admin/users/${id}/password-code`);
      return unwrapData<{ devCode?: string; expiresAt?: string }>(response.data, {});
    },
  });
}

export function useSendAdminUserEmailCode() {
  return useMutation({
    mutationFn: async ({ id, newEmail }: { id: string; newEmail: string }) => {
      const response = await apiClient.post(`/admin/users/${id}/email-code`, { newEmail });
      return unwrapData<{ devCode?: string; expiresAt?: string }>(response.data, {});
    },
  });
}

export function useSendPasswordChangeCode() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.post("/users/send-password-change-code", data);
      return unwrapData<{ devCode?: string; expiresAt?: string }>(response.data, {});
    },
  });
}

export function useChangePasswordWithCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; code: string }) => {
      const response = await apiClient.post("/users/change-password", data);
      return unwrapEntity<User>(response.data, "user", {} as User);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSendSelfEmailCode() {
  return useMutation({
    mutationFn: async (data: { newEmail: string; currentPassword: string }) => {
      const response = await apiClient.post("/users/send-email-verification", data);
      return unwrapData<{ devCode?: string; expiresAt?: string }>(response.data, {});
    },
  });
}

export function useGetOwnRoleChangeRequest(options?: QueryHookOptions) {
  return useQuery<RoleChangeRequest | null>({
    queryKey: ["own-role-change-request"],
    queryFn: async () => {
      const response = await apiClient.get("/users/role-change-request");
      return unwrapEntity<RoleChangeRequest | null>(response.data, "request", null);
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: null,
  });
}

export function useSendRoleChangeCode() {
  return useMutation({
    mutationFn: async (data: { requestedRole: string }) => {
      const response = await apiClient.post("/users/send-role-change-code", data);
      return unwrapData<{ devCode?: string; expiresAt?: string }>(response.data, {});
    },
  });
}

export function useRequestRoleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requestedRole: string; code: string }) => {
      const response = await apiClient.post("/users/request-role-change", data);
      return unwrapEntity<RoleChangeRequest>(response.data, "request", {} as RoleChangeRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["own-role-change-request"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGetAdminRoleChangeRequests(status = "pending", options?: QueryHookOptions) {
  return useQuery<RoleChangeRequest[]>({
    queryKey: ["admin-role-change-requests", status],
    queryFn: async () => {
      const response = await apiClient.get("/admin/role-change-requests", { params: { status } });
      return unwrapCollection<RoleChangeRequest>(response.data, "requests", []);
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: [],
  });
}

export function useApproveRoleChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/admin/role-change-requests/${id}/approve`);
      return unwrapEntity<RoleChangeRequest>(response.data, "request", {} as RoleChangeRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-role-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-task-details"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRejectRoleChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.patch(`/admin/role-change-requests/${id}/reject`, { reason });
      return unwrapEntity<RoleChangeRequest>(response.data, "request", {} as RoleChangeRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-role-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useVerifySelfEmailChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { newEmail: string; code: string }) => {
      const response = await apiClient.post("/users/verify-email-change", data);
      return unwrapEntity<User>(response.data, "user", {} as User);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
  const token = getStoredToken();

  return useQuery<Rule[]>({
    queryKey: ["rules"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/rules");
        return unwrapCollection<Rule>(
          response.data,
          "rules",
          fallbackRules
        );
      } catch {
        return fallbackRules;
      }
    },
    enabled: !!token,
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

const sortTasksNewestFirst = (tasks: any[]) =>
  [...tasks].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || a.start_time || a.startTime || a.deadline || 0).getTime();
    const dateB = new Date(b.created_at || b.createdAt || b.start_time || b.startTime || b.deadline || 0).getTime();
    return dateB - dateA;
  });

apiClient.interceptors.response.use((response) => {
  if (Array.isArray(response.data)) {
    const looksLikeTaskList = response.data.some(
      (item) => item && typeof item === "object" && ("deadline" in item || "start_time" in item || "startTime" in item)
    );

    if (looksLikeTaskList) {
      response.data = sortTasksNewestFirst(response.data);
    }
  }

  if (response.data && typeof response.data === "object" && Array.isArray(response.data.tasks)) {
    response.data = {
      ...response.data,
      tasks: sortTasksNewestFirst(response.data.tasks),
    };
  }

  return response;
});

export default apiClient;
