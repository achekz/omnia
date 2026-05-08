// Role du fichier: affiche une page React de l application.
import { CalendarDays, CheckCircle2, Clock3, ListChecks, TimerReset } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetTasks } from "@/lib/api-client";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

// Role: Recupere les donnees necessaires.
function getTaskDate(task: Task) {
  const value = task.startTime || task.plannedStartAt || task.dueDate || task.createdAt;
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// Role: Prepare une valeur pour l affichage ou l API.
function formatTimeWindow(task: Task) {
  const start = getTaskDate(task);
  const minutes = task.estimatedMinutes || task.estimatedDurationMinutes || 60;
  const end = new Date(start.getTime() + minutes * 60000);
  return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Role: Decrit la logique statusLabel.
function statusLabel(status: Task["status"]) {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  if (status === "overdue") return "Late";
  if (status === "declined") return "Postponed";
  return "Planned";
}

// Role: Decrit la logique statusTone.
function statusTone(status: Task["status"]) {
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-sky-100 text-sky-700";
  if (status === "overdue" || status === "declined") return "bg-rose-100 text-rose-700";
  return "bg-blue-100 text-blue-700";
}

// Role: Affiche et organise cet ecran.
export default function PlannerPage() {
  const { data: tasks = [], isLoading } = useGetTasks({ query: { refetchInterval: 30000 } });
  const now = new Date();
  const todayKey = now.toDateString();

  const plannedTasks = [...tasks]
    .filter((task) => task.status !== "declined")
    .sort((a, b) => getTaskDate(a).getTime() - getTaskDate(b).getTime());

  const todayTasks = plannedTasks.filter((task) => getTaskDate(task).toDateString() === todayKey);
  const upcomingTasks = plannedTasks.filter((task) => getTaskDate(task).getTime() >= now.getTime() && getTaskDate(task).toDateString() !== todayKey);
  const overdueTasks = tasks.filter((task) => task.status === "overdue" || ((task.delayDays || 0) > 0 && task.status !== "done"));
  const nextTask = todayTasks.find((task) => task.status !== "done") || upcomingTasks[0] || plannedTasks.find((task) => task.status !== "done");

  return (
    <ModuleLayout activeItem="planner">
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">Planning</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Planning generated from your assigned tasks, start times and deadlines.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Today&apos;s Schedule</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{todayTasks.length} task{todayTasks.length === 1 ? "" : "s"} planned today.</p>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">Loading planning...</div>
              ) : todayTasks.length ? (
                todayTasks.map((task) => (
                  <TaskScheduleCard key={task._id || task.id} task={task} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No task scheduled today. Upcoming tasks are listed on the right.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Next milestone</h2>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{nextTask?.title || "No upcoming task"}</p>
              {nextTask && <p className="mt-1 text-sm text-gray-500">{getTaskDate(nextTask).toLocaleString()}</p>}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-3">
                <TimerReset className="h-5 w-5 text-rose-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Late tasks</h2>
              </div>
              <p className="text-3xl font-black text-gray-950 dark:text-gray-100">{overdueTasks.length}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Upcoming</h2>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                {upcomingTasks.slice(0, 4).map((task) => (
                  <li key={task._id || task.id} className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="font-semibold text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{getTaskDate(task).toLocaleString()}</p>
                  </li>
                ))}
                {!upcomingTasks.length && <li className="text-gray-500">No upcoming task.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function TaskScheduleCard({ task }: { task: Task }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/60">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-blue-600" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatTimeWindow(task)}</p>
        {task.description && <p className="mt-2 line-clamp-2 text-xs text-gray-500">{task.description}</p>}
      </div>
      <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", statusTone(task.status))}>{statusLabel(task.status)}</span>
    </div>
  );
}
