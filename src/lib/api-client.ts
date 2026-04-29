import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTaskInput,
  DashboardStats,
  FinanceSummary,
  FinancialRecord,
  MlInsights,
  Notification,
  QueryHookOptions,
  Task,
  TeamMemberSummary,
  UpdateTaskInput,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("omni_ai_token");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
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
        const refreshToken = localStorage.getItem("omni_ai_refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const newToken = res.data?.data?.accessToken as string | undefined;

        if (!newToken) {
          throw new Error("Invalid refresh response");
        }

        localStorage.setItem("omni_ai_token", newToken);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem("omni_ai_token");
        localStorage.removeItem("omni_ai_refreshToken");
        localStorage.removeItem("omni_ai_user");
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
  latestRecommendation: {
    confidence: 88,
    recommendations: [
      "Batch similar tasks to reduce context switching.",
      "Prioritize high-impact items before midday.",
    ],
  },
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
