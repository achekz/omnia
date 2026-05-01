import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Coffee,
  Gauge,
  Inbox,
  LineChart,
  ListChecks,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Target,
  TimerReset,
  Zap,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useAcceptAssignedTask,
  useGenerateRecommendations,
  useGetAssignedTasks,
  useGetAnalyticsActivity,
  useGetDashboardStats,
  useMlInsights,
  useRunRiskPrediction,
  useRunRules,
  useSendAssignedTaskLater,
} from "@/lib/api-client";
import type { Task, TaskStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Level = "Low" | "Medium" | "High";

interface StudySignal {
  greeting: string;
  firstName: string;
  focusScore: number;
  focusState: Level;
  workloadState: string;
  riskScore: number;
  riskLevel: Level;
  productivityScore: number;
  completionRate: number;
  consistencyScore: number;
  dailyStudyHours: number;
  weeklyStudyHours: number;
  delayedTasks: number;
  overdueTasks: number;
  upcomingExams: Task[];
  recommendations: string[];
  nextBestAction: string;
  explanation: string;
}

const levelStyles: Record<Level, string> = {
  Low: "border-emerald-400/30 bg-emerald-500/10 text-emerald-50",
  Medium: "border-amber-400/30 bg-amber-500/10 text-amber-50",
  High: "border-rose-400/30 bg-rose-500/10 text-rose-50",
};

const readableTitle = "text-gray-100";
const readableBody = "text-gray-200";
const readableLabel = "text-gray-300";
const glassSurface = "border-blue-200/20 bg-blue-950/35 backdrop-blur-md shadow-lg shadow-blue-950/20";
const nestedGlassSurface = "border-blue-200/15 bg-indigo-950/30 backdrop-blur-md";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDaysUntil(date?: string) {
  if (!date) return 99;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function isExamTask(task: Task) {
  const tags = task.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const title = task.title.toLowerCase();
  return tags.some((tag) => ["exam", "examen", "revision", "deadline"].includes(tag)) || title.includes("exam") || title.includes("examen");
}

function normalizeRiskScore(score?: number) {
  if (score === undefined || Number.isNaN(score)) return 34;
  return clamp(score <= 1 ? score * 100 : score);
}

function getRiskLevel(score: number): Level {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getFocusState(score: number): Level {
  if (score >= 78) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function getTaskId(task: Task, index: number) {
  return task._id ?? task.id ?? `task-${index}`;
}

function deriveStudySignal(args: {
  firstName: string;
  tasks: Task[];
  riskScore: number;
  riskLevel: Level;
  recommendationTexts: string[];
  weeklyActivity?: Array<{ value?: number; activeMinutes?: number; studyHours?: number; tasksCompleted?: number }>;
}): StudySignal {
  const totalTasks = args.tasks.length || 1;
  const doneTasks = args.tasks.filter((task) => task.status === "done").length;
  const delayedTasks = args.tasks.filter((task) => task.isDelayed || (task.delayDays ?? 0) > 0).length;
  const overdueTasks = args.tasks.filter((task) => task.status === "overdue" || getDaysUntil(task.dueDate) < 0).length;
  const urgentTasks = args.tasks.filter((task) => task.priority === "critical" || task.priority === "high").length;
  const upcomingExams = args.tasks
    .filter(isExamTask)
    .sort((a, b) => getDaysUntil(a.dueDate) - getDaysUntil(b.dueDate));
  const completionRate = clamp((doneTasks / totalTasks) * 100);
  const consistencyScore = clamp(86 - delayedTasks * 12 - overdueTasks * 16 + doneTasks * 3);
  const focusScore = clamp(78 - urgentTasks * 4 - delayedTasks * 8 - args.riskScore * 0.18 + completionRate * 0.18);
  const productivityScore = clamp((completionRate * 0.38) + (consistencyScore * 0.32) + (focusScore * 0.3));
  const weeklyStudyHours =
    args.weeklyActivity?.reduce((sum, point) => sum + (point.studyHours || (point.activeMinutes ? point.activeMinutes / 60 : 0)), 0) || 18.5;
  const dailyStudyHours = Math.max(1.5, Math.round((weeklyStudyHours / 5) * 10) / 10);
  const recommendations = [
    ...args.recommendationTexts,
    args.riskScore > 55 ? "Revise Physics now while your focus is still stable." : "Use the next block for active recall, not passive reading.",
    focusScore < 60 ? "Take a 20 min break before starting another deep work session." : "Start Data Structures before 2PM to protect your afternoon focus.",
    delayedTasks ? "Fix delayed tasks first so the rule engine can relax deadline alerts." : "Keep today's optimized order and avoid switching subjects too early.",
  ].slice(0, 4);
  const nextBestAction =
    args.riskScore >= 70
      ? "Fix delays, then run a short revision sprint on the nearest exam topic."
      : focusScore < 60
        ? "Take a recovery break, then restart with a 45 min practice block."
        : "Start the highest-priority revision block now.";

  return {
    greeting: `${getGreeting()}, ${args.firstName}`,
    firstName: args.firstName,
    focusScore,
    focusState: getFocusState(focusScore),
    workloadState: urgentTasks + overdueTasks >= 3 ? "Heavy workload" : focusScore < 60 ? "Fatigue rising" : "Balanced workload",
    riskScore: args.riskScore,
    riskLevel: args.riskLevel,
    productivityScore,
    completionRate,
    consistencyScore,
    dailyStudyHours,
    weeklyStudyHours: Math.round(weeklyStudyHours * 10) / 10,
    delayedTasks,
    overdueTasks,
    upcomingExams,
    recommendations,
    nextBestAction,
    explanation:
      args.riskScore >= 70
        ? `Risk is high because ${delayedTasks} delayed task(s), ${overdueTasks} overdue item(s), and inconsistent completion patterns are lowering your study momentum.`
        : args.riskScore >= 40
          ? `Risk is moderate because the model sees some delay pressure, but your completion and consistency signals are still recoverable today.`
          : `Risk is low because your current completion rhythm is stable and there are no severe inactivity patterns in the latest signals.`,
  };
}

function HeroSection({ signal }: { signal: StudySignal }) {
  const heroStats = [
    { label: "Focus", value: signal.focusState, detail: `${signal.focusScore}%`, icon: Target, className: levelStyles[signal.focusState] },
    { label: "Workload", value: signal.workloadState, detail: `${signal.delayedTasks} delay(s)`, icon: TimerReset, className: "border-violet-400/30 bg-violet-500/10 text-violet-100" },
    { label: "Risk", value: signal.riskLevel, detail: `${signal.riskScore}%`, icon: AlertTriangle, className: levelStyles[signal.riskLevel] },
    { label: "Productivity", value: `${signal.productivityScore}%`, detail: "daily score", icon: Gauge, className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" },
  ];

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.42),rgba(15,23,42,0.24)),linear-gradient(135deg,#7c3aed_0%,#4f46e5_52%,#0ea5e9_100%)] p-6 shadow-2xl shadow-violet-950/40">
      <div className="pointer-events-none absolute inset-0 bg-blue-950/20" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="mb-4 border-white/25 bg-blue-950/35 text-gray-100 shadow-sm shadow-blue-950/20 backdrop-blur-md hover:bg-blue-950/45">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Smart study assistant
          </Badge>
          <h1 className={cn("text-3xl font-display font-bold sm:text-4xl", readableTitle)}>{signal.greeting}</h1>
          <p className={cn("mt-3 max-w-xl text-sm leading-6", readableBody)}>
            OmniAI has prioritized your study day using risk prediction, rule-engine alerts, and recent task behavior.
          </p>
        </div>
        <div className={cn("rounded-2xl p-4", glassSurface)}>
          <p className={cn("text-xs font-medium uppercase tracking-[0.2em]", readableLabel)}>Next best action</p>
          <p className={cn("mt-2 max-w-sm text-lg font-semibold leading-7", readableTitle)}>{signal.nextBestAction}</p>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {heroStats.map((stat) => (
          <div key={stat.label} className={cn("rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 hover:border-white/35 hover:bg-blue-950/45", glassSurface, stat.className)}>
            <div className="flex items-center justify-between">
              <span className={cn("text-xs font-semibold uppercase tracking-[0.16em]", readableLabel)}>{stat.label}</span>
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className={cn("text-xl font-bold", readableTitle)}>{stat.value}</p>
              <span className={cn("text-sm", readableBody)}>{stat.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIInsightCard({ signal, onAnalyze }: { signal: StudySignal; onAnalyze: () => void }) {
  return (
    <section className="glass-panel rounded-2xl border-blue-200/15 bg-blue-950/35 p-6 shadow-xl shadow-blue-950/25">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge className="border-cyan-300/40 bg-cyan-400/15 text-cyan-50 shadow-sm shadow-cyan-950/20 hover:bg-cyan-400/20">
            <BrainCircuit className="mr-1 h-3.5 w-3.5" />
            AI Insight Center
          </Badge>
          <h2 className={cn("mt-3 text-2xl font-bold", readableTitle)}>Study risk and behavior analysis</h2>
          <p className={cn("mt-2 text-sm leading-6", readableBody)}>{signal.explanation}</p>
        </div>
        <div className={cn("rounded-2xl p-4 text-center", glassSurface)}>
          <p className={cn("text-xs uppercase tracking-[0.2em]", readableLabel)}>Risk score</p>
          <p className={cn("mt-2 text-4xl font-bold", signal.riskLevel === "High" ? "text-rose-300" : signal.riskLevel === "Medium" ? "text-amber-200" : "text-emerald-300")}>
            {signal.riskScore}%
          </p>
          <Badge className={cn("mt-2 font-semibold", levelStyles[signal.riskLevel])}>{signal.riskLevel} risk</Badge>
        </div>
      </div>

      <div className="mt-6">
        <Progress value={signal.riskScore} className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:via-violet-400 [&>div]:to-rose-400" />
        <div className={cn("mt-2 flex justify-between text-xs", readableLabel)}>
          <span>Stable</span>
          <span>Watch</span>
          <span>Intervene</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <div className={cn("rounded-2xl p-4", nestedGlassSurface)}>
          <h3 className={cn("flex items-center gap-2 text-sm font-semibold", readableTitle)}>
            <LineChart className="h-4 w-4 text-cyan-300" />
            Behavior signals
          </h3>
          <div className={cn("mt-4 space-y-3 text-sm", readableBody)}>
            <div className="flex items-center justify-between">
              <span>Delayed tasks</span>
              <span className={cn("font-semibold", readableTitle)}>{signal.delayedTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Overdue items</span>
              <span className={cn("font-semibold", readableTitle)}>{signal.overdueTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Consistency</span>
              <span className={cn("font-semibold", readableTitle)}>{signal.consistencyScore}%</span>
            </div>
          </div>
        </div>

        <div className={cn("rounded-2xl p-4", nestedGlassSurface)}>
          <h3 className={cn("flex items-center gap-2 text-sm font-semibold", readableTitle)}>
            <Sparkles className="h-4 w-4 text-violet-300" />
            Smart recommendations
          </h3>
          <div className="mt-4 space-y-3">
            {signal.recommendations.map((recommendation, index) => (
              <div key={recommendation} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition hover:border-violet-300/40 hover:bg-violet-500/15">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/25 text-xs font-bold text-white">{index + 1}</span>
                <p className={cn("text-sm leading-6", readableBody)}>{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onAnalyze} className="mt-6 w-full rounded-xl border border-white/80 bg-[#F8FAFC] text-violet-950 shadow-lg shadow-violet-950/20 hover:bg-white hover:text-violet-950">
        <BrainCircuit className="h-4 w-4" />
        Analyze my performance
      </Button>
    </section>
  );
}

const taskStatusMeta: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "En attente", className: "border-amber-300/40 bg-amber-500/10 text-amber-50" },
  overdue: { label: "En retard", className: "border-rose-300/40 bg-rose-500/10 text-rose-50" },
  in_progress: { label: "Acceptée", className: "border-sky-300/40 bg-sky-500/10 text-sky-50" },
  done: { label: "Terminée", className: "border-emerald-300/40 bg-emerald-500/10 text-emerald-50" },
  declined: { label: "Plus tard", className: "border-violet-300/40 bg-violet-500/10 text-violet-50" },
};

function getAssignerName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "Admin";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Admin";
}

function formatTaskDate(date?: string) {
  if (!date) return "Sans deadline";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function AdminAssignedTasks({
  tasks,
  isConnected,
  isLoading,
  isUpdating,
  onAccept,
  onLater,
}: {
  tasks: Task[];
  isConnected: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  onAccept: (task: Task) => void;
  onLater: (task: Task) => void;
}) {
  const orderedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const statusWeight: Record<TaskStatus, number> = { overdue: 0, todo: 1, in_progress: 2, declined: 3, done: 4 };
        const left = statusWeight[a.status] ?? 5;
        const right = statusWeight[b.status] ?? 5;
        if (left !== right) return left - right;
        return new Date(a.dueDate || a.createdAt || 0).getTime() - new Date(b.dueDate || b.createdAt || 0).getTime();
      }),
    [tasks],
  );

  return (
    <section className="glass-panel rounded-2xl border-blue-200/15 bg-blue-950/35 p-6 shadow-xl shadow-blue-950/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={cn("text-2xl font-bold", readableTitle)}>Tâches envoyées par l'admin</h2>
          <p className={cn("mt-1 text-sm", readableBody)}>
            Décide rapidement: accepter la tâche ou demander plus tard. Les changements sont sauvegardés et envoyés en temps réel.
          </p>
        </div>
        <Badge className={cn("w-fit border-blue-300/40 bg-blue-500/10 font-semibold", isConnected ? "text-emerald-50" : "text-amber-50")}>
          {isConnected ? "Temps réel actif" : "Synchronisation..."}
        </Badge>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className={cn("rounded-2xl p-6 text-center text-sm", nestedGlassSurface, readableBody)}>Chargement des tâches...</div>
        ) : orderedTasks.length === 0 ? (
          <div className={cn("rounded-2xl p-8 text-center", nestedGlassSurface)}>
            <Inbox className="mx-auto mb-3 h-9 w-9 text-gray-300" />
            <p className={cn("font-semibold", readableTitle)}>Aucune tâche assignée</p>
            <p className={cn("mt-1 text-sm", readableBody)}>Les nouvelles tâches envoyées par l'admin apparaîtront ici en temps réel.</p>
          </div>
        ) : (
          orderedTasks.map((task, index) => {
            const taskId = getTaskId(task, index);
            const status = taskStatusMeta[task.status] || taskStatusMeta.todo;
            const needsDecision = task.status === "todo" || task.status === "overdue";

            return (
              <article key={taskId} className="rounded-2xl border border-blue-200/15 bg-indigo-950/30 p-4 backdrop-blur-md transition hover:border-cyan-300/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn("text-lg font-bold", readableTitle)}>{task.title}</h3>
                      <Badge className={cn("font-semibold", status.className)}>{status.label}</Badge>
                      {task.priority && (
                        <Badge className="border-white/20 bg-white/10 text-gray-100 font-semibold capitalize">{task.priority}</Badge>
                      )}
                    </div>
                    <p className={cn("mt-1 text-xs font-semibold uppercase tracking-wide", readableLabel)}>
                      Envoyée par {getAssignerName(task.createdBy as Partial<User>)}
                    </p>
                    {task.description && <p className={cn("mt-3 text-sm leading-6", readableBody)}>{task.description}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Badge className="border-cyan-300/30 bg-cyan-500/10 text-cyan-50 font-semibold">
                      <CalendarClock className="mr-1 h-3.5 w-3.5" />
                      {formatTaskDate(task.dueDate)}
                    </Badge>
                    {(task.estimatedMinutes || task.estimatedDurationMinutes) && (
                      <Badge className="border-white/20 bg-white/10 text-gray-100 font-semibold">
                        {task.estimatedMinutes || task.estimatedDurationMinutes} min
                      </Badge>
                    )}
                  </div>
                </div>

                {needsDecision ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      onClick={() => onAccept(task)}
                      disabled={isUpdating}
                      className="rounded-xl border border-emerald-300/50 bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accepter
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onLater(task)}
                      disabled={isUpdating}
                      className="rounded-xl border border-violet-300/50 bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-60"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Plus tard
                    </Button>
                  </div>
                ) : (
                  <p className={cn("mt-4 text-sm font-semibold", readableBody)}>
                    {task.status === "in_progress"
                      ? "Tâche acceptée. L'admin est notifié."
                      : task.status === "declined"
                        ? "Demande plus tard envoyée à l'admin."
                        : "Statut synchronisé avec l'admin."}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function SmartActions({
  onOptimize,
  onPlan,
  onAnalyze,
  onFixDelays,
}: {
  onOptimize: () => void;
  onPlan: () => void;
  onAnalyze: () => void;
  onFixDelays: () => void;
}) {
  const actions = [
    { label: "Optimize my study day", icon: Zap, onClick: onOptimize, tone: "from-violet-500 to-sky-500" },
    { label: "Generate revision plan", icon: ListChecks, onClick: onPlan, tone: "from-cyan-500 to-emerald-500" },
    { label: "Analyze my performance", icon: BarChart3, onClick: onAnalyze, tone: "from-indigo-500 to-violet-500" },
    { label: "Fix my delays", icon: TimerReset, onClick: onFixDelays, tone: "from-rose-500 to-amber-500" },
  ];

  return (
    <section className="glass-panel rounded-2xl border-blue-200/15 bg-blue-950/35 p-6 shadow-xl shadow-blue-950/25">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-xl font-bold", readableTitle)}>Smart actions</h2>
          <p className={cn("mt-1 text-sm", readableBody)}>One-click decisions wired to AI, recommendations, anomaly checks, and rule alerts.</p>
        </div>
        <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-50 font-semibold hover:bg-emerald-500/10">Optimized</Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={cn("group rounded-2xl bg-gradient-to-br p-px text-left shadow-md shadow-blue-950/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-950/30", action.tone)}
          >
            <span className="flex h-full items-center gap-3 rounded-2xl border border-blue-200/15 bg-indigo-950/55 p-4 text-gray-100 backdrop-blur-md transition group-hover:border-white/30 group-hover:bg-blue-950/45">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition group-hover:bg-white/25">
                <action.icon className="h-5 w-5" />
              </span>
              <span className={cn("font-semibold", readableTitle)}>{action.label}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PerformanceStats({ signal }: { signal: StudySignal }) {
  const stats = [
    { label: "Focus score", value: signal.focusScore, icon: Target, detail: "attention quality" },
    { label: "Task completion", value: signal.completionRate, icon: CheckCircle2, detail: "today's closure rate" },
    { label: "Consistency", value: signal.consistencyScore, icon: PlayCircle, detail: "routine stability" },
  ];

  return (
    <section className="glass-panel rounded-2xl border-blue-200/15 bg-blue-950/35 p-6 shadow-xl shadow-blue-950/25">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-bold", readableTitle)}>Performance metrics</h2>
          <p className={cn("mt-1 text-sm", readableBody)}>Signals that help the assistant adapt your schedule.</p>
        </div>
        <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-50 font-semibold hover:bg-cyan-500/10">Live</Badge>
      </div>

      <div className="mt-5 space-y-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <stat.icon className="h-4 w-4 text-violet-300" />
                <span className={cn("text-sm font-medium", readableTitle)}>{stat.label}</span>
              </div>
              <span className={cn("text-sm font-bold", readableTitle)}>{stat.value}%</span>
            </div>
            <Progress value={stat.value} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-violet-400 [&>div]:to-cyan-300" />
            <p className={cn("mt-1 text-xs", readableLabel)}>{stat.detail}</p>
          </div>
        ))}
      </div>

    </section>
  );
}

function ExamReminderCard({ tasks }: { tasks: Task[] }) {
  return (
    <section className="glass-panel rounded-2xl border-blue-200/15 bg-blue-950/35 p-6 shadow-xl shadow-blue-950/25">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-xl font-bold", readableTitle)}>Exam and deadline alerts</h2>
        <BellRing className="h-5 w-5 text-amber-200" />
      </div>
      <div className="mt-4 space-y-3">
        {tasks.slice(0, 3).map((task, index) => (
          <div key={getTaskId(task, index)} className="rounded-2xl border border-amber-300/30 bg-amber-500/15 p-4 backdrop-blur-sm transition hover:border-amber-200/50 hover:bg-amber-500/20">
            <div className="flex items-center gap-2 text-amber-100">
              <CalendarClock className="h-4 w-4" />
              <span className={cn("font-semibold", readableTitle)}>{task.title}</span>
            </div>
            <p className={cn("mt-1 text-sm", readableBody)}>{task.dueDate ? `${getDaysUntil(task.dueDate)} day(s) left` : "No deadline set"}</p>
          </div>
        ))}
        {!tasks.length && (
          <div className={cn("rounded-2xl p-4 text-sm", nestedGlassSurface, readableBody)}>
            Add exam or revision tasks to activate rule-engine alerts.
          </div>
        )}
      </div>
    </section>
  );
}

export default function StagiaireDashboard() {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const { data: stats } = useGetDashboardStats();
  const { data: tasks = [], isLoading: isLoadingTasks } = useGetAssignedTasks({ query: { refetchInterval: 15000 } });
  const { data: mlInsights } = useMlInsights();
  const { data: activity = [] } = useGetAnalyticsActivity();
  const acceptTask = useAcceptAssignedTask();
  const sendTaskLater = useSendAssignedTaskLater();
  const runRiskPrediction = useRunRiskPrediction();
  const generateRecommendations = useGenerateRecommendations();
  const runRules = useRunRules();

  const riskScore = normalizeRiskScore(mlInsights?.latestPrediction?.riskScore);
  const riskLevel = getRiskLevel(riskScore);
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Ranyme";

  const signal = useMemo(
    () =>
      deriveStudySignal({
        firstName,
        tasks,
        riskScore,
        riskLevel,
        recommendationTexts: mlInsights?.latestRecommendation?.recommendations ?? [],
        weeklyActivity: activity.length ? activity : stats?.weeklyActivity,
      }),
    [activity, firstName, mlInsights?.latestRecommendation?.recommendations, riskLevel, riskScore, stats?.weeklyActivity, tasks],
  );

  const optimizeStudyDay = () => {
    generateRecommendations.mutate();
    runRules.mutate();
  };

  const generateRevisionPlan = () => {
    generateRecommendations.mutate();
  };

  const analyzePerformance = () => {
    runRiskPrediction.mutate();
    generateRecommendations.mutate();
  };

  const fixDelays = () => {
    runRules.mutate();
    runRiskPrediction.mutate();
  };

  const acceptAssignedTask = (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    acceptTask.mutate(id);
  };

  const sendAssignedTaskLater = (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    sendTaskLater.mutate({ id, declineReason: "Plus tard" });
  };

  return (
    <ModuleLayout>
      <div className="space-y-6">
        <HeroSection signal={signal} />

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="space-y-6">
            <AIInsightCard signal={signal} onAnalyze={analyzePerformance} />
            <AdminAssignedTasks
              tasks={tasks}
              isConnected={isConnected}
              isLoading={isLoadingTasks}
              isUpdating={acceptTask.isPending || sendTaskLater.isPending}
              onAccept={acceptAssignedTask}
              onLater={sendAssignedTaskLater}
            />
          </div>

          <div className="space-y-6">
            <SmartActions
              onOptimize={optimizeStudyDay}
              onPlan={generateRevisionPlan}
              onAnalyze={analyzePerformance}
              onFixDelays={fixDelays}
            />
            <PerformanceStats signal={signal} />
            <div className="glass-panel rounded-2xl border-cyan-300/30 bg-blue-950/35 p-4 shadow-lg shadow-blue-950/20">
              <div className="flex items-start gap-3">
                <Coffee className="mt-1 h-5 w-5 text-cyan-200" />
                <div>
                  <p className={cn("font-semibold", readableTitle)}>Assistant note</p>
                  <p className={cn("mt-1 text-sm leading-6", readableBody)}>
                    Your schedule adapts when risk prediction, recommendations, anomaly detection, or rule alerts refresh.
                  </p>
                </div>
              </div>
            </div>
            <ExamReminderCard tasks={signal.upcomingExams} />
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
