import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Clock, MessageSquare, Timer, UserRound } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useAddTaskComment, useGetAdminUserTaskDetails } from "@/lib/api-client";
import type { Task, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function getTaskDurationSeconds(task: Task, now: number) {
  const startedAt = task.actualStartedAt || task.acceptedAt || task.startTime;
  const finishedAt = task.actualFinishedAt || task.completedAt;

  if (!startedAt) return 0;

  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : task.status === "in_progress" ? now : start;
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function getUserName(user?: Partial<User> | string) {
  if (!user || typeof user === "string") return "Utilisateur";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Utilisateur";
}

export default function AdminUserTaskDetailsPage() {
  const [, params] = useRoute("/admin/users/:id/tasks");
  const [, setLocation] = useLocation();
  const userId = params?.id;
  const { data, isLoading } = useGetAdminUserTaskDetails(userId, { query: { refetchInterval: 10000 } });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    const tasks = data.tasks || [];
    return {
      total: tasks.length,
      done: tasks.filter((task) => task.status === "done").length,
      pending: tasks.filter((task) => task.status === "todo" || task.status === "overdue").length,
      active: tasks.filter((task) => task.status === "in_progress").length,
    };
  }, [data.tasks]);

  return (
    <ModuleLayout activeItem="users">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">
                {isLoading ? "Chargement du compte..." : getUserName(data.user || undefined)}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{data.user?.email || "Détails d'exécution des tâches"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocation("/admin/users")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux utilisateurs
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total des tâches" value={summary.total} />
          <SummaryCard label="En attente" value={summary.pending} />
          <SummaryCard label="En cours" value={summary.active} />
          <SummaryCard label="Terminées" value={summary.done} />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900">Chargement des tâches...</div>
        ) : data.tasks.length ? (
          <div className="grid gap-4">
            {data.tasks.map((task) => (
              <TaskDetailCard key={task._id || task.id} task={task} duration={formatDuration(getTaskDurationSeconds(task, now))} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:bg-gray-900">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-950 dark:text-gray-100">Aucune tâche assignée à ce compte</p>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-gray-100">{value}</p>
    </div>
  );
}

function TaskDetailCard({ task, duration }: { task: Task; duration: string }) {
  const [comment, setComment] = useState("");
  const addComment = useAddTaskComment();
  const { toast } = useToast();
  const id = task._id || task.id;

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !comment.trim()) return;

    try {
      await addComment.mutateAsync({ id, message: comment });
      setComment("");
      toast({ title: "Commentaire ajouté", description: "Le commentaire de la tâche a été enregistré." });
    } catch (error: any) {
      toast({ title: "Commentaire échoué", description: error?.response?.data?.message || "Impossible d'enregistrer le commentaire.", variant: "destructive" });
    }
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">{task.title}</h2>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold uppercase", task.status === "done" ? "bg-emerald-100 text-emerald-700" : task.status === "in_progress" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>
              {translateTaskStatus(task.status)}
            </span>
          </div>
          {task.description && <p className="mt-2 text-sm leading-6 text-gray-500">{task.description}</p>}
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-700">
          <div className="flex items-center gap-2 text-xs font-bold uppercase">
            <Timer className="h-4 w-4" />
            Temps travaillé
          </div>
          <p className="mt-1 text-lg font-bold">{duration}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Info label="Démarrée" value={task.actualStartedAt || task.acceptedAt ? new Date(task.actualStartedAt || task.acceptedAt || "").toLocaleString() : "-"} />
        <Info label="Terminée" value={task.actualFinishedAt || task.completedAt ? new Date(task.actualFinishedAt || task.completedAt || "").toLocaleString() : "-"} />
        <Info label="Raison du retard" value={task.lateReason || task.declineReason || "-"} />
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-gray-100">
          <MessageSquare className="h-4 w-4" />
          Commentaires
        </div>
        <div className="space-y-2">
          {task.comments?.length ? (
            task.comments.map((item, index) => (
              <div key={item._id || `${item.createdAt}-${index}`} className="rounded-xl bg-white p-3 text-sm dark:bg-gray-900">
                <p className="font-semibold text-gray-950 dark:text-gray-100">{getUserName(item.userId as Partial<User>)}</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{item.message}</p>
                <p className="mt-1 text-xs text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Aucun commentaire pour le moment.</p>
          )}
        </div>

        <form onSubmit={submitComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Écrire un commentaire pour cette tâche"
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />
          <button disabled={addComment.isPending || !comment.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
            Ajouter
          </button>
        </form>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
        <Clock className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function translateTaskStatus(status: Task["status"]) {
  if (status === "done") return "Terminée";
  if (status === "in_progress") return "En cours";
  if (status === "overdue") return "En retard";
  if (status === "declined") return "Plus tard";
  return "En attente";
}
