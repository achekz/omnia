import { useMemo } from "react";
import {
  AlertCircle,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Gauge,
  Inbox,
  LineChart,
  ListChecks,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useGenerateRecommendations,
  useGetAnalyticsActivity,
  useGetAssignedTasks,
  useGetDashboardStats,
  useMlInsights,
  useRunRiskPrediction,
  useRunRules,
  useUpdateTaskStatus,
} from "@/lib/api-client";
import type { Task, TaskStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Level = "Low" | "Balanced" | "High";
type RiskLevel = "Low" | "Medium" | "High";

interface EmployeeSignal {
  greeting: string;
  productivityScore: number;
  weeklyPerformance: number;
  completionRate: number;
  consistencyScore: number;
  focusLevel: Level;
  workloadState: Level;
  riskScore: number;
  riskLevel: RiskLevel;
  delayedTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  activeTasks: number;
  nextBestAction: string;
  explanation: string;
  recommendations: string[];
}

const readableTitle = "text-gray-100";
const readableBody = "text-gray-200";
const readableLabel = "text-gray-300";
const glassSurface = "border-blue-200/15 bg-blue-950/35 backdrop-blur-md shadow-xl shadow-blue-950/20";
const nestedSurface = "border-blue-200/15 bg-indigo-950/30 backdrop-blur-md";

const statusMeta: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "To do", className: "border-amber-300/40 bg-amber-500/10 text-amber-50" },
  overdue: { label: "Overdue", className: "border-rose-300/40 bg-rose-500/10 text-rose-50" },
  in_progress: { label: "In progress", className: "border-sky-300/40 bg-sky-500/10 text-sky-50" },
  done: { label: "Done", className: "border-emerald-300/40 bg-emerald-500/10 text-emerald-50" },
  declined: { label: "Postponed", className: "border-violet-300/40 bg-violet-500/10 text-violet-50" },
};

// Role: Decrit la logique clamp.
function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Role: Recupere les donnees necessaires.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Role: Prepare une valeur pour l affichage ou l API.
function normalizeRiskScore(score?: number) {
  if (score === undefined || Number.isNaN(score)) return 28;
  return clamp(score <= 1 ? score * 100 : score);
}

// Role: Recupere les donnees necessaires.
function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

// Role: Recupere les donnees necessaires.
function getTaskId(task: Task, index: number) {
  return task._id ?? task.id ?? `task-${index}`;
}

// Role: Recupere les donnees necessaires.
function getDaysUntil(date?: string) {
  if (!date) return 99;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

// Role: Recupere les donnees necessaires.
function getUserName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "Admin";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Admin";
}

// Role: Prepare une valeur pour l affichage ou l API.
function formatDeadline(date?: string) {
  if (!date) return "No deadline";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// Role: Retourne un etat booleen.
function isUrgentTask(task: Task) {
  return task.status === "overdue" || task.priority === "critical" || task.priority === "high" || (task.delayDays ?? 0) > 0 || getDaysUntil(task.dueDate) <= 1;
}

// Role: Construit des donnees derivees.
function deriveEmployeeSignal(args: {
  firstName: string;
  tasks: Task[];
  riskScore: number;
  riskLevel: RiskLevel;
  currentScore?: number;
  weeklyActivity?: Array<{ value?: number; activeMinutes?: number; tasksCompleted?: number }>;
  recommendationTexts: string[];
}): EmployeeSignal {
  const totalTasks = args.tasks.length || 1;
  const doneTasks = args.tasks.filter((task) => task.status === "done").length;
  const activeTasks = args.tasks.filter((task) => task.status === "todo" || task.status === "in_progress" || task.status === "overdue").length;
  const urgentTasks = args.tasks.filter(isUrgentTask).length;
  const delayedTasks = args.tasks.filter((task) => task.isDelayed || (task.delayDays ?? 0) > 0).length;
  const overdueTasks = args.tasks.filter((task) => task.status === "overdue" || getDaysUntil(task.dueDate) < 0).length;
  const completionRate = clamp((doneTasks / totalTasks) * 100);
  const consistencyScore = clamp(88 - delayedTasks * 13 - overdueTasks * 16 + doneTasks * 2);
  const weeklyPerformance =
    args.weeklyActivity?.length
      ? clamp(args.weeklyActivity.reduce((sum, point) => sum + (point.value ?? point.tasksCompleted ?? 0), 0) / args.weeklyActivity.length)
      : clamp(args.currentScore ?? 76);
  const productivityScore = clamp((completionRate * 0.35) + (consistencyScore * 0.3) + (weeklyPerformance * 0.25) + (100 - args.riskScore) * 0.1);
  const workloadState: Level = activeTasks >= 7 || urgentTasks >= 3 ? "High" : activeTasks >= 3 ? "Balanced" : "Low";
  const focusLevel: Level = productivityScore >= 78 ? "High" : productivityScore >= 55 ? "Balanced" : "Low";
  const recommendations = [
    ...args.recommendationTexts,
    urgentTasks ? "Start the highest-priority task now before new alerts accumulate." : "Protect the next focus block for one meaningful task.",
    overdueTasks ? "Clear overdue items first to reduce rule-engine risk alerts." : "Keep the current workload order and avoid context switching.",
    productivityScore < 60 ? "Take a short break, then restart with a 30-minute execution sprint." : "Batch low-priority updates after your main task is moving.",
  ].slice(0, 4);
  const nextBestAction =
    overdueTasks > 0
      ? "Clear the oldest overdue task before starting anything new."
      : urgentTasks > 0
        ? "Start the urgent task with the nearest deadline."
        : productivityScore < 60
          ? "Reset focus, then complete one small task to regain momentum."
          : "Continue the current priority task and keep notifications batched.";

  return {
    greeting: `${getGreeting()}, ${args.firstName}`,
    productivityScore,
    weeklyPerformance,
    completionRate,
    consistencyScore,
    focusLevel,
    workloadState,
    riskScore: args.riskScore,
    riskLevel: args.riskLevel,
    delayedTasks,
    overdueTasks,
    urgentTasks,
    activeTasks,
    nextBestAction,
    recommendations,
    explanation:
      args.riskScore >= 70
        ? `Risk is high because ${overdueTasks} overdue item(s), ${delayedTasks} delayed task(s), and workload pressure are reducing execution reliability.`
        : args.riskScore >= 40
          ? `Risk is moderate. Task flow is still recoverable, but urgent work and consistency signals need attention today.`
          : `Risk is low. Completion and workload signals are stable enough to keep execution focused.`,
  };
}

// Role: Affiche et organise cet ecran.
function HeroEmployee({ signal, isConnected }: { signal: EmployeeSignal; isConnected: boolean }) {
  const cards = [
    { label: "Productivity", value: `${signal.productivityScore}%`, detail: "daily AI score", icon: Gauge, className: "border-emerald-300/30 bg-emerald-500/10 text-emerald-50" },
    { label: "Workload", value: signal.workloadState, detail: `${signal.activeTasks} active`, icon: ListChecks, className: "border-blue-300/30 bg-blue-500/10 text-blue-50" },
    { label: "Risk", value: signal.riskLevel, detail: `${signal.riskScore}%`, icon: ShieldAlert, className: signal.riskLevel === "High" ? "border-rose-300/40 bg-rose-500/10 text-rose-50" : "border-amber-300/30 bg-amber-500/10 text-amber-50" },
    { label: "Realtime", value: isConnected ? "Live" : "Syncing", detail: "notifications", icon: Zap, className: "border-cyan-300/30 bg-cyan-500/10 text-cyan-50" },
  ];

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.44),rgba(15,23,42,0.24)),linear-gradient(135deg,#2563eb_0%,#4f46e5_50%,#10b981_100%)] p-6 shadow-2xl shadow-blue-950/35">
      <div className="pointer-events-none absolute inset-0 bg-blue-950/20" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="mb-4 border-white/25 bg-blue-950/35 text-gray-100 shadow-sm shadow-blue-950/20 backdrop-blur-md hover:bg-blue-950/45">
            <BrainCircuit className="mr-1 h-3.5 w-3.5" />
            AI workspace assistant
          </Badge>
          <h1 className={cn("text-3xl font-display font-bold sm:text-4xl", readableTitle)}>{signal.greeting}</h1>
          <p className={cn("mt-3 max-w-xl text-sm leading-6", readableBody)}>
            OmniAI is prioritizing your workload using productivity signals, task delay risk, rules, and live updates.
          </p>
        </div>
        <div className={cn("rounded-2xl p-4", glassSurface)}>
          <p className={cn("text-xs font-medium uppercase tracking-[0.2em]", readableLabel)}>Next best action</p>
          <p className={cn("mt-2 max-w-sm text-lg font-semibold leading-7", readableTitle)}>{signal.nextBestAction}</p>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={cn("rounded-2xl border p-4 transition hover:-translate-y-1 hover:border-white/35 hover:bg-blue-950/45", glassSurface, card.className)}>
            <div className="flex items-center justify-between">
              <span className={cn("text-xs font-semibold uppercase tracking-[0.16em]", readableLabel)}>{card.label}</span>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className={cn("text-xl font-bold", readableTitle)}>{card.value}</p>
              <span className={cn("text-sm", readableBody)}>{card.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function AIInsightEmployee({ signal, onAnalyze }: { signal: EmployeeSignal; onAnalyze: () => void }) {
  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge className="border-cyan-300/40 bg-cyan-400/15 text-cyan-50 shadow-sm shadow-cyan-950/20 hover:bg-cyan-400/20">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            AI Insight Center
          </Badge>
          <h2 className={cn("mt-3 text-2xl font-bold", readableTitle)}>Productivity and risk analysis</h2>
          <p className={cn("mt-2 text-sm leading-6", readableBody)}>{signal.explanation}</p>
        </div>
        <div className={cn("grid min-w-44 grid-cols-2 gap-3 rounded-2xl p-3 text-center", nestedSurface)}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.16em]", readableLabel)}>Productivity</p>
            <p className="mt-2 text-3xl font-bold text-emerald-200">{signal.productivityScore}%</p>
          </div>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.16em]", readableLabel)}>Risk</p>
            <p className={cn("mt-2 text-3xl font-bold", signal.riskLevel === "High" ? "text-rose-200" : "text-amber-100")}>{signal.riskScore}%</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
        <div className={cn("rounded-2xl p-4", nestedSurface)}>
          <h3 className={cn("flex items-center gap-2 text-sm font-semibold", readableTitle)}>
            <LineChart className="h-4 w-4 text-blue-300" />
            Execution signals
          </h3>
          <div className="mt-4 space-y-4">
            {[
              ["Completion", signal.completionRate],
              ["Consistency", signal.consistencyScore],
              ["Weekly performance", signal.weeklyPerformance],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className={readableBody}>{label}</span>
                  <span className={cn("font-bold", readableTitle)}>{value}%</span>
                </div>
                <Progress value={value as number} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-emerald-300" />
              </div>
            ))}
          </div>
        </div>

        <div className={cn("rounded-2xl p-4", nestedSurface)}>
          <h3 className={cn("flex items-center gap-2 text-sm font-semibold", readableTitle)}>
            <Target className="h-4 w-4 text-emerald-300" />
            Recommendations
          </h3>
          <div className="mt-4 space-y-3">
            {signal.recommendations.map((recommendation, index) => (
              <div key={recommendation} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition hover:border-emerald-300/40 hover:bg-emerald-500/10">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-400/25 text-xs font-bold text-white">{index + 1}</span>
                <p className={cn("text-sm leading-6", readableBody)}>{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onAnalyze} className="mt-6 w-full rounded-xl border border-white/80 bg-[#F8FAFC] text-blue-950 shadow-lg shadow-blue-950/20 hover:bg-white hover:text-blue-950">
        <BrainCircuit className="h-4 w-4" />
        Analyze my productivity
      </Button>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function SmartTaskBoard({
  tasks,
  isLoading,
  isUpdating,
  onStart,
  onComplete,
}: {
  tasks: Task[];
  isLoading: boolean;
  isUpdating: boolean;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
}) {
  const urgentTasks = tasks.filter((task) => task.status !== "done" && isUrgentTask(task)).slice(0, 5);
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").slice(0, 5);
  const suggestedTasks = [...tasks]
    .filter((task) => task.status === "todo" && !isUrgentTask(task))
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
    .slice(0, 5);

  const columns = [
    { title: "Urgent", icon: AlertCircle, tasks: urgentTasks, tone: "text-rose-200", empty: "No urgent work right now." },
    { title: "In progress", icon: PlayCircle, tasks: inProgressTasks, tone: "text-sky-200", empty: "No task currently in progress." },
    { title: "Suggested by AI", icon: Sparkles, tasks: suggestedTasks, tone: "text-emerald-200", empty: "No AI suggestions until new tasks arrive." },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={cn("text-2xl font-bold", readableTitle)}>Smart task board</h2>
          <p className={cn("mt-1 text-sm", readableBody)}>Tasks are grouped by urgency, execution state, and AI priority signals.</p>
        </div>
        <Badge className="w-fit border-emerald-300/40 bg-emerald-500/10 text-emerald-50 font-semibold">AI prioritized</Badge>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className={cn("rounded-2xl p-4", nestedSurface)}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={cn("flex items-center gap-2 font-bold", readableTitle)}>
                <column.icon className={cn("h-4 w-4", column.tone)} />
                {column.title}
              </h3>
              <Badge className="border-white/20 bg-white/10 text-gray-100">{column.tasks.length}</Badge>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className={cn("rounded-xl border border-dashed border-blue-200/20 p-4 text-sm", readableBody)}>Loading tasks...</div>
              ) : column.tasks.length === 0 ? (
                <div className={cn("rounded-xl border border-dashed border-blue-200/20 p-4 text-center text-sm", readableBody)}>
                  <Inbox className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                  {column.empty}
                </div>
              ) : (
                column.tasks.map((task, index) => (
                  <EmployeeTaskCard
                    key={getTaskId(task, index)}
                    task={task}
                    isUpdating={isUpdating}
                    onStart={() => onStart(task)}
                    onComplete={() => onComplete(task)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function EmployeeTaskCard({
  task,
  isUpdating,
  onStart,
  onComplete,
}: {
  task: Task;
  isUpdating: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  const meta = statusMeta[task.status] || statusMeta.todo;
  const canStart = task.status === "todo" || task.status === "overdue";
  const canComplete = task.status === "in_progress";

  return (
    <article className="rounded-2xl border border-blue-200/15 bg-blue-950/25 p-4 transition hover:border-blue-300/40 hover:bg-blue-950/35">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className={cn("font-bold leading-snug", readableTitle)}>{task.title}</h4>
          <p className={cn("mt-1 text-xs font-semibold uppercase tracking-wide", readableLabel)}>Assigned by {getUserName(task.createdBy as Partial<User>)}</p>
        </div>
        <Badge className={cn("shrink-0 font-semibold", meta.className)}>{meta.label}</Badge>
      </div>

      {task.description && <p className={cn("mt-3 line-clamp-3 text-sm leading-6", readableBody)}>{task.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="border-white/20 bg-white/10 text-gray-100 font-semibold capitalize">{task.priority || "medium"}</Badge>
        <Badge className="border-blue-300/30 bg-blue-500/10 text-blue-50 font-semibold">
          <CalendarClock className="mr-1 h-3.5 w-3.5" />
          {formatDeadline(task.dueDate)}
        </Badge>
        {(task.delayDays ?? 0) > 0 && (
          <Badge className="border-rose-300/40 bg-rose-500/10 text-rose-50 font-semibold">{task.delayDays}d late</Badge>
        )}
        {(task.priorityScore ?? 0) >= 60 && (
          <Badge className="border-emerald-300/40 bg-emerald-500/10 text-emerald-50 font-semibold">AI Suggested</Badge>
        )}
      </div>

      {(canStart || canComplete) && (
        <div className="mt-4">
          {canStart ? (
            <Button disabled={isUpdating} onClick={onStart} className="w-full rounded-xl border border-blue-300/50 bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-60">
              <PlayCircle className="h-4 w-4" />
              Start task
            </Button>
          ) : (
            <Button disabled={isUpdating} onClick={onComplete} className="w-full rounded-xl border border-emerald-300/50 bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60">
              <CheckCircle2 className="h-4 w-4" />
              Mark complete
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

// Role: Affiche et organise cet ecran.
function SmartActionsEmployee({
  onOptimize,
  onAnalyze,
  onReprioritize,
  onFixDelays,
}: {
  onOptimize: () => void;
  onAnalyze: () => void;
  onReprioritize: () => void;
  onFixDelays: () => void;
}) {
  const actions = [
    { label: "Optimize my workload", icon: Zap, onClick: onOptimize, tone: "from-blue-500 to-cyan-500" },
    { label: "Analyze my productivity", icon: BarChart3, onClick: onAnalyze, tone: "from-indigo-500 to-blue-500" },
    { label: "Reprioritize my tasks", icon: RefreshCw, onClick: onReprioritize, tone: "from-emerald-500 to-blue-500" },
    { label: "Fix delays automatically", icon: TimerReset, onClick: onFixDelays, tone: "from-rose-500 to-amber-500" },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div>
        <h2 className={cn("text-xl font-bold", readableTitle)}>Smart actions</h2>
        <p className={cn("mt-1 text-sm", readableBody)}>AI and rule-engine actions for workload execution.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={cn("group rounded-2xl bg-gradient-to-br p-px text-left shadow-md shadow-blue-950/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/30", action.tone)}
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

// Role: Affiche et organise cet ecran.
function PerformanceEmployee({ signal }: { signal: EmployeeSignal }) {
  const metrics = [
    { label: "Daily productivity", value: signal.productivityScore, icon: Gauge, detail: "AI work score" },
    { label: "Weekly performance", value: signal.weeklyPerformance, icon: TrendingUp, detail: "activity trend" },
    { label: "Task completion", value: signal.completionRate, icon: CheckCircle2, detail: "closed work" },
    { label: "Consistency", value: signal.consistencyScore, icon: Clock3, detail: "execution stability" },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-xl font-bold", readableTitle)}>Performance metrics</h2>
          <p className={cn("mt-1 text-sm", readableBody)}>Signals OmniAI uses to tune workload recommendations.</p>
        </div>
        <Badge className="border-emerald-300/40 bg-emerald-500/10 text-emerald-50 font-semibold">Live</Badge>
      </div>

      <div className="mt-5 space-y-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-blue-300" />
                <span className={cn("text-sm font-semibold", readableTitle)}>{metric.label}</span>
              </div>
              <span className={cn("text-sm font-bold", readableTitle)}>{metric.value}%</span>
            </div>
            <Progress value={metric.value} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-emerald-300" />
            <p className={cn("mt-1 text-xs", readableLabel)}>{metric.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function ActivitySignals({ signal }: { signal: EmployeeSignal }) {
  const signals = [
    { label: "Activity stability", value: `${signal.consistencyScore}%`, tone: "text-emerald-200" },
    { label: "Focus level", value: signal.focusLevel, tone: "text-blue-200" },
    { label: "Urgent items", value: signal.urgentTasks, tone: signal.urgentTasks ? "text-rose-200" : "text-emerald-200" },
    { label: "Delayed items", value: signal.delayedTasks, tone: signal.delayedTasks ? "text-amber-200" : "text-emerald-200" },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <h2 className={cn("text-xl font-bold", readableTitle)}>Activity + signals</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {signals.map((signalItem) => (
          <div key={signalItem.label} className={cn("rounded-2xl p-4", nestedSurface)}>
            <p className={cn("text-xs uppercase tracking-[0.16em]", readableLabel)}>{signalItem.label}</p>
            <p className={cn("mt-2 text-2xl font-bold", signalItem.tone)}>{signalItem.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const { data: stats } = useGetDashboardStats();
  const { data: tasks = [], isLoading: isLoadingTasks } = useGetAssignedTasks({ query: { refetchInterval: 15000 } });
  const { data: activity = [] } = useGetAnalyticsActivity();
  const { data: mlInsights } = useMlInsights();
  const runRiskPrediction = useRunRiskPrediction();
  const generateRecommendations = useGenerateRecommendations();
  const runRules = useRunRules();
  const updateTaskStatus = useUpdateTaskStatus();

  const riskScore = normalizeRiskScore(mlInsights?.latestPrediction?.riskScore);
  const riskLevel = getRiskLevel(riskScore);
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Employee";
  const signal = useMemo(
    () =>
      deriveEmployeeSignal({
        firstName,
        tasks,
        riskScore,
        riskLevel,
        currentScore: stats?.currentScore,
        weeklyActivity: activity.length ? activity : stats?.weeklyActivity,
        recommendationTexts: mlInsights?.latestRecommendation?.recommendations ?? [],
      }),
    [activity, firstName, mlInsights?.latestRecommendation?.recommendations, riskLevel, riskScore, stats?.currentScore, stats?.weeklyActivity, tasks],
  );

  // Role: Enregistre une modification.
  const updateStatus = (task: Task, status: TaskStatus) => {
    const id = task._id || task.id;
    if (!id) return;
    updateTaskStatus.mutate({ id, status });
  };

  // Role: Lance un traitement metier ou IA.
  const analyzeProductivity = () => {
    runRiskPrediction.mutate();
    generateRecommendations.mutate();
  };

  // Role: Lance un traitement metier ou IA.
  const optimizeWorkload = () => {
    generateRecommendations.mutate();
    runRules.mutate();
  };

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="space-y-6 p-6 md:p-8">
        <HeroEmployee signal={signal} isConnected={isConnected} />

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="space-y-6">
            <AIInsightEmployee signal={signal} onAnalyze={analyzeProductivity} />
            <SmartTaskBoard
              tasks={tasks}
              isLoading={isLoadingTasks}
              isUpdating={updateTaskStatus.isPending}
              onStart={(task) => updateStatus(task, "in_progress")}
              onComplete={(task) => updateStatus(task, "done")}
            />
          </div>

          <div className="space-y-6">
            <SmartActionsEmployee
              onOptimize={optimizeWorkload}
              onAnalyze={analyzeProductivity}
              onReprioritize={optimizeWorkload}
              onFixDelays={() => {
                runRules.mutate();
                runRiskPrediction.mutate();
              }}
            />
            <PerformanceEmployee signal={signal} />
            <ActivitySignals signal={signal} />
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
