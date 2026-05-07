import { useState } from "react";
import { Link } from "wouter";
import { CalendarClock, CheckCircle2, Clock, Eye, ListChecks, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetTasks, useRescheduleTaskToday, useUpdateTaskStatus } from "@/lib/api-client";
import type { Task, TaskStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type TaskFilter = "all" | TaskStatus;

const filters: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "overdue", label: "Delayed" },
  { value: "done", label: "Completed" },
  { value: "declined", label: "Plus tard" },
];

const statusMeta: Record<TaskStatus, { label: string; tone: string; icon: JSX.Element }> = {
  todo: { label: "Pending", tone: "bg-gray-100 text-gray-700", icon: <Clock className="h-4 w-4" /> },
  overdue: { label: "Delayed", tone: "bg-red-100 text-red-700", icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: "In progress", tone: "bg-orange-100 text-orange-700", icon: <PlayCircle className="h-4 w-4" /> },
  done: { label: "Completed", tone: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> },
  declined: { label: "Plus tard", tone: "bg-rose-100 text-rose-700", icon: <XCircle className="h-4 w-4" /> },
};

// Role: Recupere les donnees necessaires.
function getUserName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "Admin";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Admin";
}

// Role: Recupere les donnees necessaires.
function getTaskId(task: Task) {
  return task._id || task.id || "";
}

// Role: Retourne un etat booleen.
function isDelayed(task: Task) {
  return task.status === "overdue" || task.isDelayed || (task.dueDate && new Date(task.dueDate) < new Date()) || (task.delayDays || 0) > 0;
}

// Role: Affiche et organise cet ecran.
export default function MyTasks() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const { data: tasks = [], isLoading } = useGetTasks({ params: { status: filter, limit: 100 }, query: { refetchInterval: 15000 } });
  const updateTaskStatus = useUpdateTaskStatus();
  const rescheduleTask = useRescheduleTaskToday();
  const { toast } = useToast();

  // Role: Enregistre une modification.
  const updateStatus = (task: Task, status: TaskStatus) => {
    const id = getTaskId(task);
    if (!id) return;

    const payload: { id: string; status: TaskStatus; declineReason?: string; lateReason?: string } = { id, status };

    if (status === "declined") {
      const reason = window.prompt("Pourquoi cette tâche est en retard / Plus tard ?");
      if (!reason?.trim()) {
        toast({ title: "Reason required", description: "You must write the reason before choosing Plus tard.", variant: "destructive" });
        return;
      }
      payload.declineReason = reason.trim();
    }

    const isLateCompletion = status === "done" && isDelayed(task);
    if (isLateCompletion) {
      const reason = window.prompt("Pourquoi cette tâche a été terminée en retard ?");
      if (!reason?.trim()) {
        toast({ title: "Reason required", description: "You must write why the task was delayed.", variant: "destructive" });
        return;
      }
      payload.lateReason = reason.trim();
    }

    updateTaskStatus.mutate(payload);
  };

  // Role: Decrit la logique rescheduleToday.
  const rescheduleToday = (task: Task) => {
    const id = getTaskId(task);
    if (!id) return;
    rescheduleTask.mutate(
      { id, status: "in_progress" },
      { onSuccess: () => toast({ title: "Task rescheduled", description: "The task is planned for today." }) },
    );
  };

  return (
    <ModuleLayout activeItem="tasks">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-3xl font-bold text-gray-100">My Tasks</h2>
              <p className="text-sm text-gray-400">Only tasks assigned to your account are shown here.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-sm shadow-slate-950/30">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "rounded-md px-3 py-2 text-xs font-bold transition",
                  filter === item.value ? "bg-white text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/30">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-950/70 text-xs font-bold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-4">Task name</th>
                <th className="px-5 py-4">Created by</th>
                <th className="px-5 py-4">Start</th>
                <th className="px-5 py-4">End</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">AI recommendation</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td className="px-5 py-8 text-center text-slate-400" colSpan={7}>Loading tasks...</td></tr>
              ) : tasks.length ? (
                tasks.map((task) => {
                  const id = getTaskId(task);
                  const meta = statusMeta[task.status] || statusMeta.todo;
                  const delayed = isDelayed(task);

                  return (
                    <tr key={id} className="text-slate-200 transition hover:bg-slate-800/50">
                      <td className="px-5 py-4">
                        <Link href={`/tasks/${id}`} className="text-base font-bold text-white hover:text-emerald-300">{task.title}</Link>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">{task.description || "No description"}</p>
                      </td>
                      <td className="px-5 py-4">{getUserName(task.createdBy as Partial<User>)}</td>
                      <td className="px-5 py-4">{task.startTime ? new Date(task.startTime).toLocaleString() : "-"}</td>
                      <td className="px-5 py-4">{task.endTime || task.dueDate ? new Date(task.endTime || task.dueDate || "").toLocaleString() : "-"}</td>
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", delayed && task.status !== "done" ? statusMeta.overdue.tone : meta.tone)}>
                          {delayed && task.status !== "done" ? statusMeta.overdue.icon : meta.icon}
                          {delayed && task.status !== "done" ? "Delayed" : meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {delayed && task.status !== "done" ? (
                          <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Replanifier aujourd’hui</span>
                        ) : (
                          <span className="text-xs text-slate-500">No urgent action</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/tasks/${id}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">
                            <Eye className="h-4 w-4" />
                            Details
                          </Link>
                          {delayed && task.status !== "done" && (
                            <button type="button" onClick={() => rescheduleToday(task)} disabled={rescheduleTask.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                              <CalendarClock className="h-4 w-4" />
                              Today
                            </button>
                          )}
                          {(task.status === "todo" || task.status === "overdue") && (
                            <>
                              <button type="button" onClick={() => updateStatus(task, "in_progress")} disabled={updateTaskStatus.isPending} className="rounded-md bg-orange-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Start</button>
                              <button type="button" onClick={() => updateStatus(task, "declined")} disabled={updateTaskStatus.isPending} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                                <PauseCircle className="h-4 w-4" />
                                Plus tard
                              </button>
                            </>
                          )}
                          {task.status === "in_progress" && (
                            <button type="button" onClick={() => updateStatus(task, "done")} disabled={updateTaskStatus.isPending} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Complete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td className="px-5 py-10 text-center text-slate-400" colSpan={7}>No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
