import { CheckCircle2, Clock, ListChecks, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetTasks, useUpdateTaskStatus } from "@/lib/api-client";
import type { Task, TaskStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TaskFilter = "all" | TaskStatus;

const filters: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "declined", label: "Cancelled" },
];

const statusMeta: Record<TaskStatus, { label: string; tone: string; icon: JSX.Element }> = {
  todo: { label: "Waiting confirmation", tone: "bg-amber-50 text-amber-700 border-amber-100", icon: <Clock className="h-4 w-4" /> },
  overdue: { label: "Waiting confirmation", tone: "bg-rose-50 text-rose-700 border-rose-100", icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: "In progress", tone: "bg-sky-50 text-sky-700 border-sky-100", icon: <PlayCircle className="h-4 w-4" /> },
  done: { label: "Completed", tone: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <CheckCircle2 className="h-4 w-4" /> },
  declined: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 border-rose-100", icon: <XCircle className="h-4 w-4" /> },
};

function getUserName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "Admin";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Admin";
}

export default function MyTasks() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const { data: tasks = [], isLoading } = useGetTasks({ query: { refetchInterval: 15000 } });
  const updateTaskStatus = useUpdateTaskStatus();

  const filteredTasks = tasks.filter((task) => (filter === "all" ? true : task.status === filter));

  const updateStatus = (task: Task, status: TaskStatus) => {
    const id = task._id || task.id;
    if (!id) return;
    updateTaskStatus.mutate({ id, status });
  };

  return (
    <ModuleLayout activeItem="tasks">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-gray-950">My Tasks</h2>
              <p className="text-sm text-gray-500">Confirm, postpone, and finish tasks assigned by admin.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-bold transition",
                  filter === item.value ? "bg-gray-950 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-950">No tasks found</p>
            <p className="mt-1 text-sm text-gray-500">New admin assignments will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id || task.id}
                task={task}
                isUpdating={updateTaskStatus.isPending}
                onConfirm={() => updateStatus(task, "in_progress")}
                onDecline={() => updateStatus(task, "declined")}
                onComplete={() => updateStatus(task, "done")}
              />
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}

function TaskCard({
  task,
  isUpdating,
  onConfirm,
  onDecline,
  onComplete,
}: {
  task: Task;
  isUpdating: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  onComplete: () => void;
}) {
  const meta = statusMeta[task.status] || statusMeta.todo;
  const needsDecision = task.status === "todo" || task.status === "overdue";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight text-gray-950">{task.title}</h3>
          <p className="mt-1 text-xs font-semibold uppercase text-gray-400">Assigned by {getUserName(task.createdBy as Partial<User>)}</p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", meta.tone)}>
          {meta.icon}
          {meta.label}
        </span>
      </div>

      {task.description && <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600">{task.description}</p>}

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
        {task.startTime && (
          <span className="rounded-full bg-gray-50 px-2.5 py-1 font-semibold">
            Start: {new Date(task.startTime).toLocaleString()}
          </span>
        )}
        {(task.estimatedMinutes || task.estimatedDurationMinutes) && (
          <span className="rounded-full bg-gray-50 px-2.5 py-1 font-semibold">
            {task.estimatedMinutes || task.estimatedDurationMinutes} min
          </span>
        )}
        {task.acceptedAt && <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">Confirmed</span>}
        {task.declinedAt && <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">Plus tard</span>}
      </div>

      {needsDecision && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUpdating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmer
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={isUpdating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
          >
            <PauseCircle className="h-4 w-4" />
            Plus tard
          </button>
        </div>
      )}

      {task.status === "in_progress" && (
        <button
          type="button"
          onClick={onComplete}
          disabled={isUpdating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Terminer
        </button>
      )}
    </article>
  );
}
