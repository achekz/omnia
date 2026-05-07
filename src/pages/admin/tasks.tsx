import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { CalendarClock, CheckCircle2, ClipboardList, Clock, Eye, PauseCircle, Pencil, PlayCircle, Plus, Save, XCircle } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useCreateTask, useGetAdminTasks, useGetAdminUsers, useRescheduleTaskToday, useUpdateTask } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";

function getUserName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "-";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "-";
}

const statusMeta: Record<TaskStatus, { label: string; tone: string; icon: JSX.Element }> = {
  todo: { label: "Pending", tone: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  overdue: { label: "Delayed", tone: "bg-rose-100 text-rose-700", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "Confirmée / In progress", tone: "bg-sky-100 text-sky-700", icon: <PlayCircle className="h-3 w-3" /> },
  done: { label: "Completed", tone: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  declined: { label: "Cancelled", tone: "bg-rose-100 text-rose-700", icon: <XCircle className="h-3 w-3" /> },
};

const roleFilters = ["all", "employee", "stagiaire", "comptable"] as const;
const statusFilters = ["all", "todo", "in_progress", "overdue", "done", "declined"] as const;
const roleFilterLabels: Record<(typeof roleFilters)[number], string> = {
  all: "All",
  employee: "Employee",
  stagiaire: "Stagiaire",
  comptable: "Comptable",
};
const statusFilterLabels: Record<(typeof statusFilters)[number], string> = {
  all: "All",
  todo: "Pending",
  in_progress: "In progress",
  overdue: "Delayed",
  done: "Completed",
  declined: "Cancelled",
};

function getTaskId(task: Task) {
  return task._id || task.id || "";
}

function isDelayed(task: Task) {
  return task.status === "overdue" || task.isDelayed || (task.dueDate && new Date(task.dueDate) < new Date()) || (task.delayDays || 0) > 0;
}

export default function AdminTasksPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [startTime, setStartTime] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(60);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const { toast } = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const rescheduleTask = useRescheduleTaskToday();
  const { data: users = [] } = useGetAdminUsers();
  const { data: tasks = [], isLoading } = useGetAdminTasks({ params: { role: roleFilter, status: statusFilter }, query: { refetchInterval: 30000 } });

  const assignableUsers = users.filter((user) => ["employee", "stagiaire", "comptable"].includes(user.role));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignedTo) {
      toast({ title: "Assigned user required", description: "Choisissez un employé, un stagiaire ou un comptable.", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        title,
        description,
        assignedTo,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        estimatedDuration,
        estimatedDurationMinutes: estimatedDuration,
        estimatedMinutes: estimatedDuration,
      };

      if (editingTaskId) {
        await updateTask.mutateAsync({ id: editingTaskId, data: payload as Partial<Task> });
      } else {
        await createTask.mutateAsync(payload);
      }

      setTitle("");
      setDescription("");
      setAssignedTo("");
      setStartTime("");
      setEstimatedDuration(60);
      setEditingTaskId("");
      toast({
        title: editingTaskId ? "Task updated" : "Task assigned",
        description: editingTaskId ? "The task was updated and the user was notified." : "The user was notified in real time and by email.",
      });
    } catch (error: any) {
      toast({ title: "Task creation failed", description: error?.response?.data?.message || "Could not create task.", variant: "destructive" });
    }
  };

  const startEdit = (task: Task) => {
    const taskId = task._id || task.id || "";
    setEditingTaskId(taskId);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setAssignedTo(typeof task.assignedTo === "object" ? task.assignedTo?._id || task.assignedTo?.id || "" : String(task.assignedTo || ""));
    setStartTime(task.startTime ? new Date(task.startTime).toISOString().slice(0, 16) : "");
    setEstimatedDuration(task.estimatedMinutes || task.estimatedDurationMinutes || 60);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingTaskId("");
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setStartTime("");
    setEstimatedDuration(60);
  };

  const rescheduleToday = (task: Task) => {
    const id = getTaskId(task);
    if (!id) return;
    rescheduleTask.mutate(
      { id, status: "in_progress" },
      { onSuccess: () => toast({ title: "Task rescheduled", description: "The task was moved to today." }) },
    );
  };

  return (
    <ModuleLayout activeItem="admin-tasks">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Task Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Assign tasks and track start, finish, and delay.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:grid-cols-5">
          {editingTaskId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 lg:col-span-5">
              Editing task. Save changes or cancel to create a new task.
            </div>
          )}
          <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} placeholder="Title" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 lg:col-span-2" />
          <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900">
            <option value="">Assign to</option>
            {assignableUsers.map((user) => (
              <option key={user._id || user.id} value={user._id || user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
          <input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900" />
          <input type="number" min={1} max={1440} value={estimatedDuration} onChange={(event) => setEstimatedDuration(Number(event.target.value))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="min-h-20 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 lg:col-span-4" />
          <button disabled={createTask.isPending || updateTask.isPending} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            {editingTaskId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingTaskId ? "Save" : "Create"}
          </button>
          {editingTaskId && (
            <button type="button" onClick={cancelEdit} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 lg:col-start-5">
              Cancel edit
            </button>
          )}
        </form>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {roleFilters.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={cn("rounded-md border px-3 py-2 text-xs font-bold capitalize", roleFilter === role ? "border-gray-950 bg-gray-950 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}
              >
                {roleFilterLabels[role]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn("rounded-md border px-3 py-2 text-xs font-bold capitalize", statusFilter === status ? "border-violet-700 bg-violet-700 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}
              >
                {statusFilterLabels[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-5 py-4">Tâche</th>
                <th className="px-5 py-4">Assigned to</th>
                <th className="px-5 py-4">Start prévu</th>
                <th className="px-5 py-4">Estimated</th>
                <th className="px-5 py-4">Started</th>
                <th className="px-5 py-4">Completed</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Résultat</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={9}>Loading tasks...</td>
                </tr>
              ) : tasks.length ? (
                tasks.map((task) => {
                  const meta = statusMeta[task.status] || statusMeta.todo;

                  return (
                    <tr key={task._id || task.id} className="text-gray-700 dark:text-gray-200">
                      <td className="px-5 py-4">
                        <Link href={`/tasks/${task._id || task.id}`} className="text-base font-bold text-gray-950 hover:text-violet-700 dark:text-gray-100">{task.title}</Link>
                        {task.description && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{task.description}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{getUserName(task.assignedTo as Partial<User>)}</p>
                        {typeof task.assignedTo === "object" && task.assignedTo?.role && (
                          <p className="mt-1 text-xs capitalize text-gray-400">{task.assignedTo.role}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">{task.startTime ? new Date(task.startTime).toLocaleString() : "-"}</td>
                      <td className="px-5 py-4">{task.estimatedMinutes || task.estimatedDurationMinutes || 0} min</td>
                      <td className="px-5 py-4">{task.actualStartedAt || task.acceptedAt ? new Date(task.actualStartedAt || task.acceptedAt || "").toLocaleString() : "-"}</td>
                      <td className="px-5 py-4">{task.actualFinishedAt || task.completedAt ? new Date(task.actualFinishedAt || task.completedAt || "").toLocaleString() : "-"}</td>
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", isDelayed(task) && task.status !== "done" ? statusMeta.overdue.tone : meta.tone)}>
                          {isDelayed(task) && task.status !== "done" ? statusMeta.overdue.icon : meta.icon}
                          {isDelayed(task) && task.status !== "done" ? "Delayed" : meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {task.status === "declined" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                            <PauseCircle className="h-3 w-3" />
                            Plus tard
                          </span>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", task.isDelayed ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                            <Clock className="h-3 w-3" />
                            {task.isDelayed ? "Delayed" : "On track"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/tasks/${task._id || task.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Link>
                          {isDelayed(task) && task.status !== "done" && (
                            <button
                              type="button"
                              onClick={() => rescheduleToday(task)}
                              disabled={rescheduleTask.isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
                            >
                              <CalendarClock className="h-4 w-4" />
                              Today
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-3 py-2 text-xs font-bold text-violet-600 transition hover:bg-violet-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={9}>No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
