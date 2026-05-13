// Role du fichier: affiche une page reservee au compte admin.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Bot, CalendarClock, CheckCircle2, Filter, Gauge, ListTodo, Plus, Search, Timer, Zap } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useCreateTask, useGetTaskUsers, useGetUserTasks, useRescheduleTaskToday, useUpdateTaskStatus } from "@/lib/api-client";
import { useSocket } from "@/context/SocketContext";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskPriority, TaskStatus, TaskUserSummary, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleFilters = ["all", "employee", "stagiaire", "comptable"] as const;
const statusFilters = ["all", "todo", "in_progress", "overdue", "done", "declined"] as const;
const priorityFilters = ["all", "low", "medium", "high", "critical"] as const;
const deadlineFilters = ["all", "today", "week", "overdue"] as const;

const statusMeta: Record<TaskStatus, { label: string; tone: string; bar: string }> = {
  todo: { label: "Pending", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30", bar: "bg-amber-400" },
  in_progress: { label: "In progress", tone: "bg-blue-500/15 text-blue-200 border-blue-500/30", bar: "bg-blue-400" },
  done: { label: "Completed", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30", bar: "bg-emerald-400" },
  overdue: { label: "Overdue", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30", bar: "bg-rose-400" },
  declined: { label: "Plus tard", tone: "bg-slate-500/15 text-slate-200 border-slate-500/30", bar: "bg-slate-400" },
};

// Role: Prepare une valeur pour l affichage ou l API.
function getUserId(user?: Partial<User> | TaskUserSummary | null) {
  return user?._id || user?.id || "";
}

// Role: Prepare une valeur pour l affichage ou l API.
function getUserName(user?: Partial<User> | string | null) {
  if (!user || typeof user === "string") return "-";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "-";
}

// Role: Prepare une valeur pour l affichage ou l API.
function initials(name?: string) {
  return String(name || "U").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

// Role: Prepare une valeur pour l affichage ou l API.
function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Role: Retourne un etat booleen.
function isDelayed(task: Task) {
  return task.status === "overdue" || task.isDelayed || Boolean(task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done");
}

// Role: Prepare une valeur pour l affichage ou l API.
function taskProgress(task: Task) {
  if (task.status === "done") return 100;
  if (task.progress !== undefined) return task.progress;
  if (task.status === "in_progress") return 45;
  return 0;
}

// Role: Affiche et organise cet ecran.
export default function AdminTasksPage() {
  const [, params] = useRoute("/admin/tasks/:userId");
  const [, setLocation] = useLocation();
  const { isConnected } = useSocket();
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityFilters)[number]>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<(typeof deadlineFilters)[number]>("all");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [startTime, setStartTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);

  const selectedUserId = params?.userId || "";
  const { data: users = [] } = useGetTaskUsers({ role: roleFilter }, { query: { refetchInterval: 15000 } });
  const { data: userTaskPayload, isLoading } = useGetUserTasks(
    selectedUserId,
    { status: statusFilter, priority: priorityFilter, deadline: deadlineFilter },
    { query: { enabled: Boolean(selectedUserId), refetchInterval: 15000 } },
  );
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const resendTask = useRescheduleTaskToday();

  const selectedUserSummary = users.find((user) => getUserId(user) === selectedUserId);
  const selectedUser = selectedUserSummary || userTaskPayload.user;
  const tasks = userTaskPayload.tasks || [];
  const stats = userTaskPayload.stats || selectedUserSummary?.taskStats || null;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return `${user.fullName || user.name || ""} ${user.email || ""} ${user.role || ""}`.toLowerCase().includes(query);
    });
  }, [search, users]);

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setLocation(`/admin/tasks/${getUserId(users[0])}`);
    }
  }, [selectedUserId, setLocation, users]);

  const summary = useMemo(() => {
    const aggregate = users.reduce(
      (acc, user) => {
        const stat = user.taskStats;
        acc.total += stat?.total || 0;
        acc.completed += stat?.completed || 0;
        acc.overdue += stat?.overdue || 0;
        acc.productivity += user.productivityScore || 0;
        return acc;
      },
      { total: 0, completed: 0, overdue: 0, productivity: 0 },
    );
    return {
      ...aggregate,
      avgProductivity: users.length ? Math.round(aggregate.productivity / users.length) : 0,
    };
  }, [users]);

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) {
      toast({ title: "Select user", description: "Choose an account before assigning a task.", variant: "destructive" });
      return;
    }

    try {
      await createTask.mutateAsync({
        title,
        description,
        assignedTo: selectedUserId,
        priority,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        estimatedMinutes,
        estimatedDurationMinutes: estimatedMinutes,
      });
      setTitle("");
      setDescription("");
      setStartTime("");
      setEstimatedMinutes(60);
      toast({ title: "Task assigned", description: "The selected account was notified instantly." });
    } catch (error: any) {
      toast({ title: "Task creation failed", description: error?.response?.data?.message || "Could not create task.", variant: "destructive" });
    }
  };

  const quickStatus = (task: Task, status: TaskStatus, progress?: number) => {
    const id = task._id || task.id;
    if (!id) return;
    updateStatus.mutate({ id, status, progress });
  };

  const resendLaterTask = async (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    try {
      await resendTask.mutateAsync({ id, status: "todo" });
      toast({ title: "Task sent again", description: "The Plus tard task was returned to the selected account." });
    } catch (error: any) {
      toast({ title: "Could not resend task", description: error?.response?.data?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <ModuleLayout activeItem="admin-tasks">
      <div className="min-h-full bg-gray-950 p-3 text-gray-100 sm:p-4 lg:p-6">
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <UserSidebar users={filteredUsers} selectedUserId={selectedUserId} roleFilter={roleFilter} search={search} onSearch={setSearch} onRoleFilter={setRoleFilter} onSelect={(id) => setLocation(`/admin/tasks/${id}`)} />

          <main className="space-y-5">
            <HeaderSummary summary={summary} isConnected={isConnected} />
            <Charts stats={stats} />

            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/20">
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Assign task</p>
                  <h2 className="text-xl font-bold">{selectedUser ? getUserName(selectedUser) : "Select an account"}</h2>
                </div>
                <FilterBar status={statusFilter} priority={priorityFilter} deadline={deadlineFilter} onStatus={setStatusFilter} onPriority={setPriorityFilter} onDeadline={setDeadlineFilter} />
              </div>

              <form onSubmit={submitTask} className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_160px_190px_120px_auto]">
                <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} placeholder="Task title" className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-violet-400" />
                <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-violet-400">
                  {priorityFilters.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-violet-400" />
                <input type="number" min={1} max={1440} value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-violet-400" />
                <button disabled={createTask.isPending || !selectedUserId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                  Assign
                </button>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="min-h-20 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-violet-400 lg:col-span-5" />
              </form>
            </section>

            <section className="space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">Loading user tasks...</div>
              ) : tasks.length ? (
                tasks.map((task, index) => <TaskCard key={task._id || task.id || index} task={task} onStatus={quickStatus} onResend={resendLaterTask} isResending={resendTask.isPending} />)
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900 p-8 text-center text-gray-400">No tasks for this account.</div>
              )}
            </section>
          </main>
        </div>
      </div>
    </ModuleLayout>
  );
}

function UserSidebar({ users, selectedUserId, roleFilter, search, onSearch, onRoleFilter, onSelect }: { users: TaskUserSummary[]; selectedUserId: string; roleFilter: string; search: string; onSearch: (value: string) => void; onRoleFilter: (value: any) => void; onSelect: (id: string) => void }) {
  return (
    <aside className="rounded-2xl border border-gray-800 bg-gray-900 p-3 shadow-xl shadow-black/20 sm:p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Accounts</h1>
        <p className="text-sm text-gray-500">User-centric task management</p>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2">
        <Search className="h-4 w-4 text-gray-500" />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search account" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {roleFilters.map((role) => (
          <button key={role} onClick={() => onRoleFilter(role)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-bold capitalize", roleFilter === role ? "border-violet-500 bg-violet-500/20 text-violet-100" : "border-gray-700 text-gray-400")}>{role}</button>
        ))}
      </div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 xl:max-h-none">
        {users.map((user) => {
          const id = getUserId(user);
          const name = user.fullName || getUserName(user);
          const active = id === selectedUserId;
          return (
            <button key={id} onClick={() => onSelect(id)} className={cn("w-full rounded-2xl border p-4 text-left transition", active ? "border-violet-400 bg-violet-500/15" : "border-gray-800 bg-gray-950 hover:border-gray-700")}>
              <div className="flex items-start gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 font-black text-white">
                  {user.avatar ? <img src={user.avatar} alt={name} className="h-full w-full rounded-xl object-cover" /> : initials(name)}
                  <span className={cn("absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-gray-950", user.isOnline ? "bg-emerald-400" : "bg-gray-500")} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-100">{name}</p>
                  <p className="text-xs capitalize text-gray-500">Role: {user.role}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className="rounded-lg bg-gray-900 px-2 py-1 text-gray-300">Pending: {user.pendingTasks || 0}</span>
                    <span className="rounded-lg bg-gray-900 px-2 py-1 text-emerald-300">Score: {user.productivityScore || 0}%</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function HeaderSummary({ summary, isConnected }: { summary: { total: number; completed: number; overdue: number; avgProductivity: number }; isConnected: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard icon={<ListTodo />} label="Total tasks" value={summary.total} />
      <SummaryCard icon={<CheckCircle2 />} label="Completed" value={summary.completed} tone="emerald" />
      <SummaryCard icon={<AlertTriangle />} label="Overdue" value={summary.overdue} tone="rose" />
      <SummaryCard icon={<Gauge />} label="Avg productivity" value={`${summary.avgProductivity}%`} tone={isConnected ? "blue" : "amber"} suffix={isConnected ? "Live" : "Offline"} />
    </div>
  );
}

function SummaryCard({ icon, label, value, tone = "violet", suffix }: { icon: JSX.Element; label: string; value: number | string; tone?: "violet" | "emerald" | "rose" | "blue" | "amber"; suffix?: string }) {
  const tones = { violet: "text-violet-300 bg-violet-500/15", emerald: "text-emerald-300 bg-emerald-500/15", rose: "text-rose-300 bg-rose-500/15", blue: "text-blue-300 bg-blue-500/15", amber: "text-amber-300 bg-amber-500/15" };
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>{icon}</div>
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-100">{value}</p>
      {suffix && <p className="mt-1 text-xs text-gray-500">{suffix}</p>}
    </div>
  );
}

function Charts({ stats }: { stats: any }) {
  const data = stats?.productivityEvolution || [];
  const completion = [{ name: "Completed", value: stats?.completed || 0 }, { name: "Pending", value: stats?.pending || 0 }, { name: "Overdue", value: stats?.overdue || 0 }];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 font-bold">Productivity evolution</h2>
        <div className="h-48 sm:h-52">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid strokeDasharray="4 4" stroke="#334155" /><XAxis dataKey="day" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Area dataKey="productivity" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} /></AreaChart></ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 font-bold">Task completion rate</h2>
        <div className="h-48 sm:h-52">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={completion}><CartesianGrid strokeDasharray="4 4" stroke="#334155" /><XAxis dataKey="name" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ status, priority, deadline, onStatus, onPriority, onDeadline }: any) {
  return (
    <div className="flex flex-wrap gap-2">
      <Filter className="mt-2 h-4 w-4 text-gray-500" />
      <select value={status} onChange={(event) => onStatus(event.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold"><option value="all">All status</option>{statusFilters.filter((x) => x !== "all").map((x) => <option key={x} value={x}>{x}</option>)}</select>
      <select value={priority} onChange={(event) => onPriority(event.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold"><option value="all">All priority</option>{priorityFilters.filter((x) => x !== "all").map((x) => <option key={x} value={x}>{x}</option>)}</select>
      <select value={deadline} onChange={(event) => onDeadline(event.target.value)} className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold"><option value="all">All deadlines</option><option value="today">Today</option><option value="week">This week</option><option value="overdue">Overdue</option></select>
    </div>
  );
}

function TaskCard({ task, onStatus, onResend, isResending }: { task: Task; onStatus: (task: Task, status: TaskStatus, progress?: number) => void; onResend: (task: Task) => void; isResending?: boolean }) {
  const meta = statusMeta[task.status] || statusMeta.todo;
  const progress = taskProgress(task);
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", meta.tone)}>{meta.label}</span>
            <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-bold capitalize text-gray-300">{task.priority || "medium"}</span>
            {isDelayed(task) && <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-200">Delay warning</span>}
            {task.aiRecommendation?.recommendation && <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200"><Bot className="h-3 w-3" /> AI</span>}
          </div>
          <h3 className="text-lg font-black text-white">{task.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{task.description || "No description provided."}</p>
          <div className="mt-4 grid gap-3 text-xs text-gray-400 md:grid-cols-3">
            <span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Deadline: {formatDate(task.dueDate || task.endTime)}</span>
            <span className="inline-flex items-center gap-2"><Timer className="h-4 w-4" /> Estimated: {task.estimatedMinutes || task.estimatedDurationMinutes || 0} min</span>
            <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" /> Risk: {Math.round((task.delayRisk || 0) * 100)}%</span>
          </div>
          {task.aiRecommendation?.recommendation && <p className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-100">{task.aiRecommendation.recommendation}</p>}
        </div>
        <div className="w-full lg:w-56">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-400"><span>Progress</span><span>{progress}%</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-800"><div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {task.status === "declined" && (
              <button disabled={isResending} onClick={() => onResend(task)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50">
                Renvoyer
              </button>
            )}
            {task.status === "todo" && <button onClick={() => onStatus(task, "in_progress", 35)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Start</button>}
            {task.status !== "done" && <button onClick={() => onStatus(task, "done", 100)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Complete</button>}
            {task.status === "in_progress" && <button onClick={() => onStatus(task, "in_progress", Math.min(95, progress + 15))} className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-bold text-gray-100">+15%</button>}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
