// Role du fichier: affiche une page reservee au compte admin.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useRoute } from "wouter";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import {
  useCreateTask,
  useGetTaskUsers,
  useGetUserTasks,
  useRescheduleTaskToday,
} from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskPriority, TaskStatus, TaskUserSummary, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleFilters = ["all", "employee", "stagiaire", "comptable"] as const;
const statusFilters = ["all", "todo", "in_progress", "overdue", "done", "declined"] as const;
const priorityOptions: TaskPriority[] = ["low", "medium", "high", "critical"];

const statusMeta: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: "Pending", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  in_progress: { label: "In progress", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  done: { label: "Completed", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  overdue: { label: "Overdue", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  declined: { label: "Plus tard", tone: "border-violet-200 bg-violet-50 text-violet-700" },
};

function getUserId(user?: Partial<User> | TaskUserSummary | null) {
  return user?._id || user?.id || "";
}

function getUserName(user?: Partial<User> | TaskUserSummary | string | null) {
  if (!user || typeof user === "string") return "Compte";
  const fullName = "fullName" in user ? user.fullName : "";
  return fullName || user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Compte";
}

function initials(name?: string) {
  return String(name || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTasksPage() {
  const [, params] = useRoute("/admin/tasks/:userId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
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
    { status: statusFilter },
    { query: { enabled: Boolean(selectedUserId), refetchInterval: 15000 } },
  );
  const createTask = useCreateTask();
  const resendTask = useRescheduleTaskToday();

  const selectedUserSummary = users.find((user) => getUserId(user) === selectedUserId);
  const selectedUser = selectedUserSummary || userTaskPayload.user;
  const tasks = userTaskPayload.tasks || [];
  const stats = userTaskPayload.stats || selectedUserSummary?.taskStats || null;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      `${getUserName(user)} ${user.email || ""} ${user.role || ""}`.toLowerCase().includes(query),
    );
  }, [search, users]);

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setLocation(`/admin/tasks/${getUserId(users[0])}`);
    }
  }, [selectedUserId, setLocation, users]);

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!selectedUserId) {
      toast({ title: "Choisir un compte", description: "Sélectionne employee, stagiaire ou comptable avant de créer la tâche.", variant: "destructive" });
      return;
    }

    if (!trimmedTitle) {
      toast({ title: "Titre requis", description: "Remplis le titre de la tâche avant de créer.", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1) {
      toast({ title: "Durée requise", description: "Indique une durée valide avant de créer la tâche.", variant: "destructive" });
      return;
    }

    try {
      await createTask.mutateAsync({
        title: trimmedTitle,
        description: trimmedDescription,
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
      toast({ title: "Tâche créée", description: "La tâche a été envoyée au compte sélectionné." });
    } catch (error: any) {
      toast({ title: "Création échouée", description: error?.response?.data?.message || "Impossible de créer la tâche.", variant: "destructive" });
    }
  }

  async function resendLaterTask(task: Task) {
    const id = task._id || task.id;
    if (!id) return;

    try {
      await resendTask.mutateAsync({ id, status: "todo" });
      toast({ title: "Tâche renvoyée", description: "La tâche est revenue dans la liste du compte." });
    } catch (error: any) {
      toast({ title: "Renvoi échoué", description: error?.response?.data?.message || "Réessaie dans un instant.", variant: "destructive" });
    }
  }

  return (
    <ModuleLayout activeItem="admin-tasks">
      <div className="min-h-full bg-gray-50 p-4 text-gray-950 dark:bg-gray-950 dark:text-gray-100 lg:p-6">
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Créer une tâche</p>
              <h1 className="mt-1 text-2xl font-display font-bold">Assigner une tâche à un compte</h1>
              <p className="mt-1 text-sm text-gray-500">
                Compte sélectionné: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedUser ? getUserName(selectedUser) : "aucun"}</span>
              </p>
            </div>
            {selectedUser && <SelectedUserMini user={selectedUser} stats={stats} />}
          </div>

          <form onSubmit={submitTask} className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_160px_220px_130px_auto]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={3}
              placeholder="Titre de la tâche"
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
            >
              {priorityOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
            />
            <input
              type="number"
              min={1}
              max={1440}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
            />
            <button
              disabled={createTask.isPending || !selectedUserId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Créer
            </button>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              className="min-h-20 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 lg:col-span-5"
            />
          </form>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <AccountList
            users={filteredUsers}
            selectedUserId={selectedUserId}
            roleFilter={roleFilter}
            search={search}
            onSearch={setSearch}
            onRoleFilter={setRoleFilter}
            onSelect={(id) => setLocation(`/admin/tasks/${id}`)}
          />

          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SelectedUserDetails user={selectedUser} stats={stats} />
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-bold capitalize transition",
                        statusFilter === status
                          ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400",
                      )}
                    >
                      {status === "all" ? "All tasks" : statusMeta[status]?.label || status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                Chargement des tâches...
              </div>
            ) : tasks.length ? (
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <TaskRow
                    key={task._id || task.id || index}
                    task={task}
                    onResend={resendLaterTask}
                    isResending={resendTask.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="font-semibold">Aucune tâche créée par cet admin pour ce compte.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </ModuleLayout>
  );
}

function SelectedUserMini({ user, stats }: { user: Partial<User> | TaskUserSummary; stats: any }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {user.role || user.profileType}
      </span>
      <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
        Completed: {stats?.completed || 0}
      </span>
      <span className="rounded-full bg-violet-50 px-3 py-1.5 font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
        Plus tard: {stats?.later || 0}
      </span>
    </div>
  );
}

function AccountList({
  users,
  selectedUserId,
  roleFilter,
  search,
  onSearch,
  onRoleFilter,
  onSelect,
}: {
  users: TaskUserSummary[];
  selectedUserId: string;
  roleFilter: string;
  search: string;
  onSearch: (value: string) => void;
  onRoleFilter: (value: any) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Liste des comptes</h2>
        <p className="text-sm text-gray-500">Employee, stagiaire et comptable</p>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Rechercher un compte"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {roleFilters.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onRoleFilter(role)}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-bold capitalize transition",
              roleFilter === role
                ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100"
                : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400",
            )}
          >
            {role}
          </button>
        ))}
      </div>

      <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
        {users.map((user) => {
          const id = getUserId(user);
          const name = getUserName(user);
          const isActive = id === selectedUserId;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition",
                isActive
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-500/15"
                  : "border-gray-200 bg-white hover:border-violet-200 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 font-black text-white">
                  {user.avatar ? <img src={user.avatar} alt={name} className="h-full w-full rounded-xl object-cover" /> : initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{name}</p>
                  <p className="text-xs capitalize text-gray-500">Role: {user.role}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      Pending: {user.pendingTasks || 0}
                    </span>
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      Score: {user.productivityScore || 0}%
                    </span>
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

function SelectedUserDetails({ user, stats }: { user?: Partial<User> | TaskUserSummary | null; stats: any }) {
  if (!user) {
    return (
      <div>
        <h2 className="text-xl font-bold">Choisir un compte</h2>
        <p className="text-sm text-gray-500">Clique sur un compte pour afficher ses informations et ses anciennes tâches.</p>
      </div>
    );
  }

  const name = getUserName(user);

  return (
    <div className="flex min-w-0 gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 font-black text-white">
        {user.avatar ? <img src={user.avatar} alt={name} className="h-full w-full rounded-2xl object-cover" /> : initials(name)}
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold">{name}</h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            {user.email || "-"}
          </span>
          <span className="inline-flex items-center gap-1.5 capitalize">
            <UserRound className="h-4 w-4" />
            {user.role || user.profileType}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">Total: {stats?.total || 0}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Completed: {stats?.completed || 0}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">Pending: {stats?.pending || 0}</span>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">Plus tard: {stats?.later || 0}</span>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onResend, isResending }: { task: Task; onResend: (task: Task) => void; isResending?: boolean }) {
  const meta = statusMeta[task.status] || statusMeta.todo;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", meta.tone)}>{meta.label}</span>
            <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold capitalize text-gray-500 dark:border-gray-700">
              {task.priority || "medium"}
            </span>
          </div>
          <h3 className="text-lg font-bold">{task.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">{task.description || "Aucune description."}</p>
          <div className="mt-4 grid gap-2 text-sm text-gray-500 md:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Deadline: {formatDate(task.dueDate || task.endTime)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Start: {formatDate(task.startTime || task.plannedStartAt)}
            </span>
            <span>Durée: {task.estimatedMinutes || task.estimatedDurationMinutes || 0} min</span>
          </div>
          {task.declineReason && (
            <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              Raison Plus tard: {task.declineReason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {task.status === "declined" && (
            <button
              type="button"
              onClick={() => onResend(task)}
              disabled={isResending}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Renvoyer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
