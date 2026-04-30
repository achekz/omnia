import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Attendance,
  CreateTaskInput,
  DashboardStats,
  FinanceSummary,
  FinancialRecord,
  MlInsights,
  Notification,
  QueryHookOptions,
  Rule,
  Task,
  TeamMemberSummary,
  UpdateTaskInput,
  User,
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

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);

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
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);

        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const newToken = res.data?.data?.accessToken as string | undefined;

        if (!newToken) {
          throw new Error("Invalid refresh response");
        }

        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        localStorage.setItem(LEGACY_TOKEN_STORAGE_KEY, newToken);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
        localStorage.removeItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

const fallbackNotifications: Notification[] = [
  {
    id: "welcome-notification",
    type: "info",
    title: "Welcome to Omni AI",
    message: "Your workspace is ready. Start by exploring your dashboard modules.",
    isRead: false,
    source: "system",
    createdAt: new Date().toISOString(),
  },
];

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

const fallbackRules: Rule[] = [
  {
    id: "default-delay-rule",
    name: "Task delay alert",
    description: "IF task delay > 2 days THEN notify assigned user",
    trigger: "scheduled",
    resource: "task",
    roles: ["employee", "stagiaire"],
    conditions: [{ metric: "task.delayDays", operator: "gt", value: 2 }],
    action: {
      type: "notify",
      target: "assignedUser",
      severity: "warning",
      title: "Task delay alert",
      message: "A task assigned to you is delayed by more than 2 days.",
      actionUrl: "/tasks",
    },
    isActive: true,
    cooldownMinutes: 720,
  },
];

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

export function useGetTasks(options?: QueryHookOptions) {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/tasks");
        return unwrapCollection<Task>(response.data, "tasks", fallbackTasks);
      } catch {
        return fallbackTasks;
      }
    },
    enabled: options?.query?.enabled ?? true,
    refetchInterval: options?.query?.refetchInterval,
    initialData: fallbackTasks,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      try {
        const response = await apiClient.post("/tasks", data);
        return unwrapEntity<Task>(response.data, "task", {
          id: crypto.randomUUID(),
          title: data.title,
          status: data.status ?? "todo",
          description: data.description,
          priority: data.priority ?? "medium",
          dueDate: data.dueDate,
        });
      } catch {
        return {
          id: crypto.randomUUID(),
          title: data.title,
          status: data.status ?? "todo",
          description: data.description,
          priority: data.priority ?? "medium",
          dueDate: data.dueDate,
        } satisfies Task;
      }
    },
    onSuccess: (createdTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (current = fallbackTasks) => [createdTask, ...current]);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateTaskInput) => {
      try {
        const response = await apiClient.put(`/tasks/${id}`, data);
        return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status: "todo", ...data });
      } catch {
        const currentTasks = queryClient.getQueryData<Task[]>(["tasks"]) ?? fallbackTasks;
        const existingTask = currentTasks.find((task) => task._id === id || task.id === id);
        return { ...existingTask, ...data, id } as Task;
      }
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (current = fallbackTasks) =>
        current.map((task) => {
          const taskId = task._id ?? task.id;
          const updatedId = updatedTask._id ?? updatedTask.id;
          return taskId === updatedId ? { ...task, ...updatedTask } : task;
        }),
      );
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task["status"] }) => {
      const response = await apiClient.patch(`/tasks/${id}/status`, { status });
      return unwrapEntity<Task>(response.data, "task", { id, title: "Task", status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGetMyAttendance(month: number, year: number, options?: QueryHookOptions) {
  return useQuery<{ records: Attendance[]; today: Attendance | null; serverTime?: string }>({
    queryKey: ["attendance", month, year],
    queryFn: async () => {
      const response = await apiClient.get(`/attendance/me?month=${month}&year=${year}`);
      return unwrapData(response.data, { records: [], today: null });
    },
    enabled: options?.query?.enabled ?? true,
    initialData: { records: [], today: null },
  });
}

export function useSendAttendanceCode() {
  return useMutation({
    mutationFn: async (data: { action: "check-in" | "check-out"; reason?: string }) => {
      const response = await apiClient.post("/attendance/send-code", data);
      return unwrapData(response.data, {});
    },
  });
}

export function useConfirmAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { action: "check-in" | "check-out"; code: string; reason?: string }) => {
      const response = await apiClient.post("/attendance/confirm", data);
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

export function useGetAdminTasks(options?: QueryHookOptions) {
  return useQuery<Task[]>({
    queryKey: ["admin-tasks"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/tasks");
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

export function useRunRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/rules/run", { trigger: "manual" });
      return unwrapData<{ rulesEvaluated?: number; triggeredCount?: number }>(response.data, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

export default apiClient;
