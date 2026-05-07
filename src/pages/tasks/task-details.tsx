import { ArrowLeft, CalendarClock, CheckCircle2, Clock, PlayCircle, Sparkles, XCircle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetTaskDetails, useRescheduleTaskToday } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusMeta: Record<TaskStatus, { label: string; tone: string; icon: JSX.Element }> = {
  todo: { label: "Pending", tone: "bg-gray-100 text-gray-700", icon: <Clock className="h-4 w-4" /> },
  overdue: { label: "Delayed", tone: "bg-red-100 text-red-700", icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: "In progress", tone: "bg-orange-100 text-orange-700", icon: <PlayCircle className="h-4 w-4" /> },
  done: { label: "Completed", tone: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> },
  declined: { label: "Plus tard", tone: "bg-rose-100 text-rose-700", icon: <XCircle className="h-4 w-4" /> },
};

// Role: Recupere les donnees necessaires.
function getUserName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "-";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "-";
}

// Role: Prepare une valeur pour l affichage ou l API.
function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

// Role: Retourne un etat booleen.
function isDelayed(task?: Task | null) {
  if (!task) return false;
  return task.status === "overdue" || task.isDelayed || (task.dueDate && new Date(task.dueDate) < new Date()) || (task.delayDays || 0) > 0;
}

// Role: Affiche et organise cet ecran.
export default function TaskDetailsPage() {
  const [, params] = useRoute("/tasks/:id");
  const taskId = params?.id;
  const { data: task, isLoading } = useGetTaskDetails(taskId, { query: { refetchInterval: 15000 } });
  const reschedule = useRescheduleTaskToday();
  const { toast } = useToast();

  const delayed = isDelayed(task);
  const meta = task ? statusMeta[task.status] || statusMeta.todo : statusMeta.todo;
  const executed = task?.status === "done" || Boolean(task?.actualStartedAt || task?.actualFinishedAt || task?.completedAt);

  // Role: Decrit la logique rescheduleToday.
  const rescheduleToday = () => {
    if (!taskId) return;
    reschedule.mutate(
      { id: taskId, status: "in_progress" },
      { onSuccess: () => toast({ title: "Task rescheduled", description: "The task is now planned for today." }) },
    );
  };

  return (
    <ModuleLayout activeItem="tasks">
      <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
        <Link href="/tasks" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>

        {isLoading ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Loading task...</div>
        ) : !task ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-slate-400">Task not found.</div>
        ) : (
          <>
            <section className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="font-display text-3xl font-bold text-white">{task.title}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{task.description || "No description fournie."}</p>
                </div>
                <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold", delayed && task.status !== "done" ? statusMeta.overdue.tone : meta.tone)}>
                  {delayed && task.status !== "done" ? statusMeta.overdue.icon : meta.icon}
                  {delayed && task.status !== "done" ? "Delayed" : meta.label}
                </span>
              </div>
            </section>

            {task.aiRecommendation?.shouldRescheduleToday || (delayed && task.status !== "done") ? (
              <section className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-5 text-amber-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-bold">AI recommendation</p>
                      <p className="mt-1 text-sm">{task.aiRecommendation?.recommendation || "Cette tâche est en retard, replanifier aujourd’hui."}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={rescheduleToday}
                    disabled={reschedule.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Replanifier aujourd’hui
                  </button>
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2">
              <Info label="Assigned to" value={getUserName(task.assignedTo as Partial<User>)} />
              <Info label="Created by" value={getUserName(task.createdBy as Partial<User>)} />
              <Info label="Date création" value={formatDate(task.createdAt)} />
              <Info label="Date début" value={formatDate(task.startTime || task.plannedStartAt)} />
              <Info label="Date fin" value={formatDate(task.endTime || task.dueDate)} />
              <Info label="Exécutée" value={executed ? "Oui" : "Non"} />
              <Info label="Démarrage réel" value={formatDate(task.actualStartedAt || task.acceptedAt)} />
              <Info label="End réelle" value={formatDate(task.actualFinishedAt || task.completedAt)} />
              <Info label="Durée réelle" value={task.actualMinutes ? `${task.actualMinutes} min` : "-"} />
              <Info label="Delay" value={delayed ? "Oui" : "Non"} />
            </section>

            {(task.declineReason || task.lateReason) && (
              <section className="rounded-lg border border-amber-400/30 bg-slate-900 p-5">
                <p className="text-sm font-bold text-white">Reason</p>
                <p className="mt-2 text-sm text-slate-300">{task.lateReason || task.declineReason}</p>
              </section>
            )}
          </>
        )}
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm shadow-slate-950/20">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-100">{value}</p>
    </div>
  );
}
