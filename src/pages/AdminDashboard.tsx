import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Loader2, LogOut, RefreshCw, ShieldCheck, Users, ClipboardList, Sparkles, TimerReset } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/hooks/useAuth";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  city?: string;
  phoneNumber?: string;
  createdAt?: string;
}

interface AdminTask {
  _id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: string;
  assignedTo?: { _id?: string; name?: string; email?: string } | string;
  createdBy?: { _id?: string; name?: string; email?: string } | string;
  createdAt?: string;
}

interface PresenceRecord {
  _id: string;
  name: string;
  status: string;
  city?: string;
  verificationMethod?: string;
  checkInTime?: string;
  lateReason?: string;
}

interface PerformanceRecord {
  _id: string;
  completedTasks?: number;
  delayedTasks?: number;
  executionMinutes?: number;
  score?: number;
  date?: string;
  userId?: {
    name?: string;
    email?: string;
  };
}

interface RecommendationRecord {
  _id: string;
  summary: string;
  recommendations?: string[];
  score?: number | null;
  ranking?: number | null;
  createdAt?: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  tenants: number;
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  presenceCount: number;
  recommendationCount: number;
  performanceScore: number;
  weeklyLogins: number;
}

interface AdminDashboardPayload {
  stats: AdminStats;
  users: AdminUser[];
  recentUsers: AdminUser[];
  tasks: AdminTask[];
  presenceRecords: PresenceRecord[];
  performanceLogs: PerformanceRecord[];
  recommendations: RecommendationRecord[];
  aiSummary?: {
    bestEmployee?: { name?: string; performanceScore?: number };
    mostDisciplined?: { name?: string; disciplineScore?: number };
    delayedUsers?: Array<{ name?: string; delayedTasks?: number }>;
  } | null;
}

const emptyStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  tenants: 0,
  totalTasks: 0,
  completedTasks: 0,
  delayedTasks: 0,
  inProgressTasks: 0,
  pendingTasks: 0,
  presenceCount: 0,
  recommendationCount: 0,
  performanceScore: 0,
  weeklyLogins: 0,
};

const emptyDashboard: AdminDashboardPayload = {
  stats: emptyStats,
  users: [],
  recentUsers: [],
  tasks: [],
  presenceRecords: [],
  performanceLogs: [],
  recommendations: [],
  aiSummary: null,
};

const taskStatuses = [
  { value: "todo", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "overdue", label: "Delayed" },
] as const;

const taskPriorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [dashboard, setDashboard] = useState<AdminDashboardPayload>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
  });

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const refresh = () => {
      void loadDashboard(false);
    };

    socket.on("task_created", refresh);
    socket.on("task_updated", refresh);
    socket.on("new_notification", refresh);

    return () => {
      socket.off("task_created", refresh);
      socket.off("task_updated", refresh);
      socket.off("new_notification", refresh);
    };
  }, [socket]);

  const assigneeOptions = useMemo(
    () => dashboard.users.filter((entry) => entry.role !== "admin"),
    [dashboard.users],
  );

  const visibleUsers = useMemo(
    () => dashboard.users.filter((entry) => entry._id !== user?._id),
    [dashboard.users, user?._id],
  );

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") {
      return visibleUsers;
    }

    return visibleUsers.filter((entry) => entry.role === roleFilter);
  }, [visibleUsers, roleFilter]);

  async function loadDashboard(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await apiClient.get("/admin/dashboard");
      const payload = (response.data?.data || emptyDashboard) as Partial<AdminDashboardPayload>;

      setDashboard({
        stats: { ...emptyStats, ...(payload.stats || {}) },
        users: payload.users || [],
        recentUsers: payload.recentUsers || [],
        tasks: payload.tasks || [],
        presenceRecords: payload.presenceRecords || [],
        performanceLogs: payload.performanceLogs || [],
        recommendations: payload.recommendations || [],
        aiSummary: payload.aiSummary || null,
      });
    } catch (error) {
      toast({
        title: "Admin dashboard unavailable",
        description: "Unable to load admin workspace data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleTaskFormChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      toast({
        title: "Task title required",
        description: "Enter a title before creating a task.",
        variant: "destructive",
      });
      return;
    }

    setCreatingTask(true);

    try {
      await apiClient.post("/tasks", {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        assignedTo: taskForm.assignedTo || undefined,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || undefined,
      });

      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
      });

      toast({
        title: "Task created",
        description: "The task was created and assigned successfully.",
      });

      await loadDashboard(false);
    } catch {
      toast({
        title: "Task creation failed",
        description: "Unable to create the task right now.",
        variant: "destructive",
      });
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleTaskStatusChange(taskId: string, status: AdminTask["status"]) {
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status });
      await loadDashboard(false);
    } catch {
      toast({
        title: "Status update failed",
        description: "Unable to update task status.",
        variant: "destructive",
      });
    }
  }

  async function handleToggleUser(userId: string) {
    try {
      await apiClient.put(`/admin/users/${userId}/activate`);
      await loadDashboard(false);
    } catch {
      toast({
        title: "User update failed",
        description: "Unable to change user status.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Admin workspace</p>
            <h1 className="mt-2 text-4xl font-display font-bold">Control center</h1>
            <p className="mt-2 text-slate-500">Connected as {user?.email}. Manage users, tasks, presence, performance, and weekly recommendations.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadDashboard(false)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard icon={<Users className="h-5 w-5" />} label="Users" value={dashboard.stats.totalUsers} sublabel={`${dashboard.stats.activeUsers} active`} />
          <StatsCard icon={<ClipboardList className="h-5 w-5" />} label="Tasks" value={dashboard.stats.totalTasks} sublabel={`${dashboard.stats.completedTasks} completed`} />
          <StatsCard icon={<TimerReset className="h-5 w-5" />} label="Presence" value={dashboard.stats.presenceCount} sublabel={`${dashboard.stats.weeklyLogins} weekly logins`} />
          <StatsCard icon={<Sparkles className="h-5 w-5" />} label="AI Score" value={dashboard.stats.performanceScore} sublabel={`${dashboard.stats.recommendationCount} recommendations`} />
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Task management</h2>
                <p className="text-sm text-slate-500">Create tasks, assign people, and track live status changes.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {dashboard.tasks.length} visible tasks
              </span>
            </div>

            <form onSubmit={handleCreateTask} className="grid gap-4 rounded-3xl bg-slate-50 p-4 md:grid-cols-2">
              <input
                name="title"
                value={taskForm.title}
                onChange={handleTaskFormChange}
                placeholder="Task title"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500"
              />
              <select
                name="assignedTo"
                value={taskForm.assignedTo}
                onChange={handleTaskFormChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500"
              >
                <option value="">Assign later / to myself</option>
                {assigneeOptions.map((entry) => (
                  <option key={entry._id} value={entry._id}>
                    {entry.name} ({entry.role})
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                value={taskForm.description}
                onChange={handleTaskFormChange}
                placeholder="Description"
                className="min-h-[110px] rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 md:col-span-2"
              />
              <select
                name="priority"
                value={taskForm.priority}
                onChange={handleTaskFormChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500"
              >
                {taskPriorities.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                name="dueDate"
                value={taskForm.dueDate}
                onChange={handleTaskFormChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={creatingTask}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60 md:col-span-2"
              >
                {creatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Create task
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {dashboard.tasks.length === 0 ? (
                <EmptyState text="No tasks found yet." />
              ) : (
                dashboard.tasks.map((task) => (
                  <div key={task._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{task.title}</h3>
                          <TaskBadge value={task.priority} tone="priority" />
                          <TaskBadge value={task.status} tone="status" />
                        </div>
                        {task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}
                        <p className="mt-3 text-xs text-slate-500">
                          Assigned to {getPersonLabel(task.assignedTo)} • Created by {getPersonLabel(task.createdBy)}
                        </p>
                      </div>
                      <select
                        value={task.status}
                        onChange={(event) => void handleTaskStatusChange(task._id, event.target.value as AdminTask["status"])}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500"
                      >
                        {taskStatuses.map((entry) => (
                          <option key={entry.value} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Users management</h2>
                  <p className="text-sm text-slate-500">Filter accounts by role and manage activation.</p>
                </div>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="comptable">Comptable</option>
                  <option value="stagiaire">Stagiaire</option>
                </select>
              </div>
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <EmptyState text="No users match this filter." />
                ) : (
                  filteredUsers.map((entry) => (
                    <div key={entry._id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                      <div>
                        <p className="font-semibold">{entry.name}</p>
                        <p className="text-sm text-slate-500">{entry.email}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{entry.role}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleUser(entry._id)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          entry.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        {entry.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">AI Recommendations (last 6 days)</h2>
              <p className="mt-1 text-sm text-slate-500">Latest saved recommendations from your recommendation history.</p>
              <div className="mt-4 grid gap-3">
                <AiSummaryCard
                  title="Best employee"
                  value={dashboard.aiSummary?.bestEmployee?.name || "Not available yet"}
                  detail={dashboard.aiSummary?.bestEmployee?.performanceScore ? `Score ${dashboard.aiSummary.bestEmployee.performanceScore}` : "Waiting for AI data"}
                />
                <AiSummaryCard
                  title="Most disciplined"
                  value={dashboard.aiSummary?.mostDisciplined?.name || "Not available yet"}
                  detail={dashboard.aiSummary?.mostDisciplined?.disciplineScore ? `Discipline ${dashboard.aiSummary.mostDisciplined.disciplineScore}` : "Waiting for AI data"}
                />
                <AiSummaryCard
                  title="Delayed users"
                  value={
                    dashboard.aiSummary?.delayedUsers?.length
                      ? dashboard.aiSummary.delayedUsers.map((entry) => `${entry.name} (${entry.delayedTasks})`).join(", ")
                      : "No delayed users in the last 6 days"
                  }
                  detail="Based on tasks and performance logs"
                />
              </div>
              <div className="mt-4 space-y-3">
                {dashboard.recommendations.length === 0 ? (
                  <EmptyState text="No recommendations saved yet." />
                ) : (
                  dashboard.recommendations.slice(0, 4).map((entry) => (
                    <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                      <p className="font-semibold">{entry.summary}</p>
                      {entry.recommendations?.length ? (
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                          {entry.recommendations.slice(0, 3).map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Presence records</h2>
            <div className="mt-4 space-y-3">
              {dashboard.presenceRecords.length === 0 ? (
                <EmptyState text="No presence records available." />
              ) : (
                dashboard.presenceRecords.map((entry) => (
                  <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{entry.name}</p>
                        <p className="text-sm text-slate-500">
                          {entry.city || "Unknown city"} • {entry.verificationMethod || "N/A"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {entry.status}
                      </span>
                    </div>
                    {entry.lateReason ? <p className="mt-2 text-sm text-slate-600">Late reason: {entry.lateReason}</p> : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Performance overview</h2>
            <div className="mt-4 space-y-3">
              {dashboard.performanceLogs.length === 0 ? (
                <EmptyState text="No performance logs available." />
              ) : (
                dashboard.performanceLogs.map((entry) => (
                  <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{entry.userId?.name || "Unknown user"}</p>
                        <p className="text-sm text-slate-500">{formatDate(entry.date)}</p>
                      </div>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                        Score {entry.score || 0}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Completed: {entry.completedTasks || 0} • Delays: {entry.delayedTasks || 0} • Execution: {entry.executionMinutes || 0} min
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, sublabel }: { icon: ReactNode; label: string; value: number; sublabel: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        {icon}
      </div>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{sublabel}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">{text}</div>;
}

function AiSummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function TaskBadge({ value, tone }: { value: string; tone: "priority" | "status" }) {
  const palette =
    tone === "priority"
      ? {
          low: "bg-sky-50 text-sky-700",
          medium: "bg-amber-50 text-amber-700",
          high: "bg-rose-50 text-rose-700",
          critical: "bg-violet-50 text-violet-700",
        }
      : {
          todo: "bg-slate-100 text-slate-700",
          in_progress: "bg-blue-50 text-blue-700",
          done: "bg-emerald-50 text-emerald-700",
          overdue: "bg-rose-50 text-rose-700",
        };

  const className = palette[value as keyof typeof palette] || "bg-slate-100 text-slate-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{value.replace("_", " ")}</span>;
}

function getPersonLabel(value: AdminTask["assignedTo"] | AdminTask["createdBy"]) {
  if (!value) {
    return "Unassigned";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.name || value.email || "Unknown";
}

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
