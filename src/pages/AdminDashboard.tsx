// Role du fichier: affiche une page React de l application.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Eye,
  Gauge,
  Loader2,
  Network,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import apiClient, { useGetRules } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { ModuleLayout } from "@/components/layout/module-layout";
import { cn } from "@/lib/utils";
import type { Rule } from "@/lib/types";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AdminTask {
  _id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "overdue" | "declined";
  priority: "low" | "medium" | "high" | "critical";
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeSessions?: number;
  totalTasks: number;
  completedTasks: number;
  alertsTriggered?: number;
  anomaliesDetected?: number;
}

interface AdminDashboardPayload {
  stats: AdminStats;
  users: AdminUser[];
  tasks: AdminTask[];
  aiMetrics?: {
    alertsTriggered?: number;
    anomaliesDetected?: number;
    riskDistribution?: Record<RiskLevel, number>;
    riskUsers?: Array<{
      userId?: string;
      riskLevel: RiskLevel;
      riskScore: number;
    }>;
  };
}

type RiskLevel = "low" | "medium" | "high";
type SystemHealth = "Good" | "Warning" | "Critical";

interface RiskUser extends AdminUser {
  riskLevel: RiskLevel;
  riskScore: number;
  signals: string[];
}

interface AdminIntel {
  inactiveUsers: AdminUser[];
  highRiskUsers: RiskUser[];
  riskUsers: RiskUser[];
  riskDistribution: Record<RiskLevel, number>;
  alertsCount: number;
  activeSessions: number;
  anomaliesDetected: number;
  systemHealth: SystemHealth;
  nextAction: string;
}

const defaultDashboard: AdminDashboardPayload = {
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    activeSessions: 0,
    totalTasks: 0,
    completedTasks: 0,
    alertsTriggered: 0,
    anomaliesDetected: 0,
  },
  users: [],
  tasks: [],
  aiMetrics: {
    alertsTriggered: 0,
    anomaliesDetected: 0,
    riskDistribution: { low: 0, medium: 0, high: 0 },
    riskUsers: [],
  },
};

// Role: Affiche et organise cet ecran.
export default function AdminDashboard() {
  const { toast } = useToast();
  const { data: rules = [] } = useGetRules();
  const [dashboard, setDashboard] = useState<AdminDashboardPayload>(defaultDashboard);
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState<"behavior" | "anomalies" | "risks" | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  // Role: Recupere les donnees necessaires.
  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/dashboard");
      setDashboard({ ...defaultDashboard, ...res.data.data });
    } catch {
      toast({
        title: "Error",
        description: "Cannot load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const intel = useMemo(() => buildAdminIntel(dashboard, rules), [dashboard, rules]);

  // Role: Lance un traitement metier ou IA.
  async function runAdminAction(action: "behavior" | "anomalies" | "risks") {
    try {
      setRunningAction(action);
      if (action === "behavior") {
        await loadDashboard();
        toast({ title: "System behavior refreshed", description: "Dashboard telemetry has been recalculated." });
      }
      if (action === "anomalies") {
        const response = await apiClient.post("/admin/detect-global-anomalies");
        await loadDashboard();
        const anomalyScore = response.data?.data?.anomalyScore;
        toast({
          title: "Global anomaly detection executed",
          description: anomalyScore !== undefined ? `Latest anomaly score: ${Number(anomalyScore).toFixed(2)}.` : "ML anomaly signals have been refreshed.",
        });
      }
      if (action === "risks") {
        const response = await apiClient.post("/admin/monitor-user-risks");
        await loadDashboard();
        const result = response.data?.data || {};
        toast({
          title: "User risks monitored",
          description: `${result.usersEvaluated || 0} users evaluated, ${result.highRiskUsers || 0} high-risk users found.`,
        });
      }
    } catch {
      toast({
        title: "Action failed",
        description: "The control action could not be completed right now.",
        variant: "destructive",
      });
    } finally {
      setRunningAction(null);
    }
  }

  if (loading) {
    return (
      <ModuleLayout activeItem="dashboard">
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <AdminHero dashboard={dashboard} intel={intel} />
          <AdminActions
            isAnalyzing={runningAction === "behavior"}
            isDetecting={runningAction === "anomalies"}
            isMonitoring={runningAction === "risks"}
            onAnalyze={() => void runAdminAction("behavior")}
            onDetect={() => void runAdminAction("anomalies")}
            onMonitor={() => void runAdminAction("risks")}
          />
          <SystemMetrics dashboard={dashboard} intel={intel} />

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
            <SystemInsight intel={intel} rules={rules} />
            <UserOverview intel={intel} dashboard={dashboard} />
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function AdminHero({ dashboard, intel }: { dashboard: AdminDashboardPayload; intel: AdminIntel }) {
  const healthTone = {
    Good: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    Warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    Critical: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  }[intel.systemHealth];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/40">
      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-b border-slate-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-200">
              <Network className="h-3.5 w-3.5" />
              OmniAI Admin Control Center
            </span>
            <span className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wide", healthTone)}>
              <Gauge className="h-3.5 w-3.5" />
              System {intel.systemHealth}
            </span>
          </div>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-display font-bold tracking-normal text-white sm:text-4xl">AI System Control Center</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              Command users, automation rules, anomaly signals, and platform health from one operational surface.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroSignal icon={<UserCheck className="h-4 w-4" />} label="Active users" value={dashboard.stats.activeUsers} />
            <HeroSignal icon={<ShieldAlert className="h-4 w-4" />} label="Alerts" value={intel.alertsCount} alert={intel.alertsCount > 0} />
            <HeroSignal icon={<BrainCircuit className="h-4 w-4" />} label="AI anomalies" value={intel.anomaliesDetected} alert={intel.anomaliesDetected > 2} />
          </div>
        </div>
        <div className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next admin action</p>
            <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-100">{intel.nextAction}</p>
                  <p className="mt-1 text-sm text-amber-100/70">Generated from user activity, risk distribution, and rule pressure.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <MiniSignal label="Users" value={dashboard.stats.totalUsers} />
            <MiniSignal label="Risk" value={intel.riskDistribution.high + intel.riskDistribution.medium} />
            <MiniSignal label="Done" value={dashboard.stats.completedTasks} />
          </div>
        </div>
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function SystemInsight({ intel, rules }: { intel: AdminIntel; rules: Rule[] }) {
  const activeRules = rules.filter((rule) => rule.isActive !== false).length;
  const riskTotal = Math.max(1, intel.riskDistribution.low + intel.riskDistribution.medium + intel.riskDistribution.high);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">AI System Insight</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Global AI status: supervised</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            OmniAI is watching task pressure, inactivity, rule triggers, and global anomaly signals across every profile.
          </p>
        </div>
        <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
          {activeRules} active rule{activeRules === 1 ? "" : "s"} feeding alerts
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Risk distribution</span>
            <span className="text-xs font-bold uppercase text-slate-500">{intel.anomaliesDetected} anomalies</span>
          </div>
          <RiskBar label="Low" value={intel.riskDistribution.low} total={riskTotal} className="bg-emerald-400" />
          <RiskBar label="Medium" value={intel.riskDistribution.medium} total={riskTotal} className="bg-amber-400" />
          <RiskBar label="High" value={intel.riskDistribution.high} total={riskTotal} className="bg-rose-500" />
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-cyan-300" />
            <h3 className="font-bold text-white">Explanation</h3>
          </div>
          <p className="text-sm leading-6 text-slate-400">
            {intel.highRiskUsers.length
              ? `${intel.highRiskUsers.map((user) => user.name || user.email).slice(0, 3).join(", ")} require attention because they combine inactivity, high-priority work, or overdue signals.`
              : "No high-risk users are currently visible. The system trend is stable, with risk concentrated in routine operational monitoring."}
          </p>
          <div className="mt-4 grid gap-3 overflow-x-auto sm:grid-cols-[repeat(3,minmax(8.5rem,1fr))]">
            <InsightChip label="Trend" value={intel.alertsCount > 4 ? "Alert pressure rising" : "Controlled"} tone={intel.alertsCount > 4 ? "amber" : "emerald"} />
            <InsightChip label="Users at risk" value={intel.riskUsers.length} tone={intel.riskUsers.length ? "amber" : "emerald"} />
            <InsightChip label="AI confidence" value="88%" tone="cyan" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function UserOverview({ dashboard, intel }: { dashboard: AdminDashboardPayload; intel: AdminIntel }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">User Overview</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Population control</h2>
        </div>
        <a href="/admin/users" className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
          <Eye className="h-4 w-4" />
          Details
        </a>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <OverviewStat icon={<UserCheck className="h-4 w-4" />} label="Active" value={dashboard.stats.activeUsers} tone="emerald" />
        <OverviewStat icon={<UserX className="h-4 w-4" />} label="Inactive" value={intel.inactiveUsers.length} tone="slate" />
        <OverviewStat icon={<ShieldAlert className="h-4 w-4" />} label="High risk" value={intel.highRiskUsers.length} tone="rose" />
      </div>
      <div className="mt-5 space-y-3">
        {(intel.riskUsers.length ? intel.riskUsers : dashboard.users.slice(0, 3)).map((user) => {
          const riskUser = isRiskUser(user) ? user : null;

          return (
            <a
              key={user._id || user.email}
              href="/admin/users"
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 p-3 transition hover:border-cyan-400/40 hover:bg-slate-900"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">{user.name || user.email}</p>
                <p className="truncate text-xs text-slate-500">{user.role} · {user.email}</p>
              </div>
              <span className={cn("ml-3 rounded-md px-2 py-1 text-xs font-bold uppercase", riskUser ? riskTone(riskUser.riskLevel) : "bg-emerald-400/10 text-emerald-200")}>
                {riskUser ? riskUser.riskLevel : user.isActive ? "active" : "inactive"}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function AdminActions({
  isAnalyzing,
  isDetecting,
  isMonitoring,
  onAnalyze,
  onDetect,
  onMonitor,
}: {
  isAnalyzing: boolean;
  isDetecting: boolean;
  isMonitoring: boolean;
  onAnalyze: () => void;
  onDetect: () => void;
  onMonitor: () => void;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <ActionButton icon={<RefreshCw className="h-4 w-4" />} label="Analyze system behavior" busy={isAnalyzing} onClick={onAnalyze} />
      <ActionButton icon={<Radar className="h-4 w-4" />} label="Detect global anomalies" busy={isDetecting} onClick={onDetect} tone="rose" />
      <ActionButton icon={<ShieldCheck className="h-4 w-4" />} label="Monitor user risks" busy={isMonitoring} onClick={onMonitor} tone="cyan" />
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function SystemMetrics({ dashboard, intel }: { dashboard: AdminDashboardPayload; intel: AdminIntel }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<Users className="h-5 w-5" />} label="Total users" value={dashboard.stats.totalUsers} />
      <MetricCard icon={<Activity className="h-5 w-5" />} label="Active sessions" value={intel.activeSessions} />
      <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Tasks completed" value={dashboard.stats.completedTasks} />
      <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Alerts triggered" value={intel.alertsCount} alert={intel.alertsCount > 0} />
    </section>
  );
}

// Role: Construit des donnees derivees.
function buildAdminIntel(dashboard: AdminDashboardPayload, rules: Rule[]): AdminIntel {
  const inactiveUsers = dashboard.users.filter((user) => !user.isActive);
  const metricRiskDistribution = dashboard.aiMetrics?.riskDistribution || { low: 0, medium: 0, high: 0 };
  const riskDistribution: Record<RiskLevel, number> = {
    low: metricRiskDistribution.low || 0,
    medium: metricRiskDistribution.medium || 0,
    high: metricRiskDistribution.high || 0,
  };
  const riskUsers = (dashboard.aiMetrics?.riskUsers || [])
    .filter((riskUser) => riskUser.riskLevel !== "low")
    .map((riskUser) => {
      const matchedUser = dashboard.users.find((user) => user._id === riskUser.userId) || {
        _id: riskUser.userId || crypto.randomUUID(),
        name: "Monitored user",
        email: "risk-monitoring@omniai.local",
        role: "user",
        isActive: true,
      };

      return {
        ...matchedUser,
        riskLevel: riskUser.riskLevel,
        riskScore: Math.round((riskUser.riskScore || 0) * 100),
        signals: ["Latest ML prediction", `${riskUser.riskLevel} risk`, `Score ${Math.round((riskUser.riskScore || 0) * 100)}%`],
      };
    });

  const activeRules = rules.filter((rule) => rule.isActive !== false);
  const triggeredAlerts = rules.filter((rule) => rule.lastTriggeredAt || rule.action?.severity === "danger").length;
  const alertsCount = dashboard.stats.alertsTriggered ?? dashboard.aiMetrics?.alertsTriggered ?? triggeredAlerts;
  const anomaliesDetected = dashboard.stats.anomaliesDetected ?? dashboard.aiMetrics?.anomaliesDetected ?? 0;
  const systemHealth: SystemHealth = anomaliesDetected >= 8 || riskDistribution.high >= 3 ? "Critical" : anomaliesDetected >= 3 || riskDistribution.medium >= 2 ? "Warning" : "Good";
  const nextAction =
    riskDistribution.high > 0
      ? "Review anomaly alerts"
      : inactiveUsers.length > 0
        ? "Check inactive users"
        : activeRules.length < Math.max(1, rules.length)
          ? "Update rule configuration"
          : "Monitor user risks";

  return {
    inactiveUsers,
    highRiskUsers: riskUsers.filter((user) => user.riskLevel === "high"),
    riskUsers,
    riskDistribution,
    alertsCount,
    activeSessions: Math.max(0, dashboard.stats.activeSessions ?? 0),
    anomaliesDetected,
    systemHealth,
    nextAction,
  };
}

// Role: Affiche et organise cet ecran.
function ActionButton({ icon, label, busy, onClick, tone = "slate" }: { icon: ReactNode; label: string; busy: boolean; onClick: () => void; tone?: "slate" | "rose" | "orange" | "cyan" }) {
  const tones = {
    slate: "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20",
    orange: "border-orange-400/30 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20",
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20",
  };

  return (
    <button type="button" onClick={onClick} disabled={busy} className={cn("inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-bold transition disabled:opacity-60", tones[tone])}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// Role: Affiche et organise cet ecran.
function MetricCard({ icon, label, value, alert }: { icon: ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-md", alert ? "bg-rose-500/10 text-rose-200" : "bg-cyan-500/10 text-cyan-200")}>{icon}</div>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function HeroSignal({ icon, label, value, alert }: { icon: ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
      <div className={cn("mb-2 flex items-center gap-2 text-xs font-bold uppercase", alert ? "text-orange-300" : "text-slate-400")}>
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function MiniSignal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function RiskBar({ label, value, total, className }: { label: string; value: number; total: number; className: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.round((value / total) * 100)}%` }} />
      </div>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function InsightChip({ label, value, tone }: { label: string; value: ReactNode; tone: "emerald" | "amber" | "cyan" }) {
  const tones = {
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  };

  return (
    <div className={cn("min-w-[8.5rem] rounded-md border p-3", tones[tone])}>
      <p className="text-xs font-bold uppercase opacity-70">{label}</p>
      <p className="mt-1 max-w-full whitespace-normal break-words font-bold leading-6">{value}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function OverviewStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "emerald" | "slate" | "rose" }) {
  const tones = {
    emerald: "bg-emerald-400/10 text-emerald-200",
    slate: "bg-slate-800 text-slate-300",
    rose: "bg-rose-500/10 text-rose-200",
  };

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
      <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-md", tones[tone])}>{icon}</div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// Role: Decrit la logique riskTone.
function riskTone(level: RiskLevel) {
  if (level === "high") return "bg-rose-500/10 text-rose-200";
  if (level === "medium") return "bg-amber-400/10 text-amber-200";
  return "bg-emerald-400/10 text-emerald-200";
}

// Role: Retourne un etat booleen.
function isRiskUser(user: AdminUser | RiskUser): user is RiskUser {
  return "riskLevel" in user;
}
