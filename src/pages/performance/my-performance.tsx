// Role du fichier: affiche une page React de l application.
import { AlertCircle, Award, CheckCircle2, Presentation, Target, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/useAuth";
import { useGetAnalyticsActivity, useGetAnalyticsScore, useGetTasks } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Role: Affiche et organise cet ecran.
export default function MyPerformancePage() {
  const { user } = useAuth();
  const { data: tasks = [] } = useGetTasks({ query: { refetchInterval: 30000 } });
  const { data: activity = [] } = useGetAnalyticsActivity();
  const { data: score } = useGetAnalyticsScore();

  if (!user || !["employee", "stagiaire", "comptable"].includes(user.profileType || user.role)) {
    return (
      <ModuleLayout activeItem="performances">
        <div className="p-8 text-center text-gray-500">Access Restricted</div>
      </ModuleLayout>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
  const overdueTasks = tasks.filter((task) => task.status === "overdue" || (task.delayDays || 0) > 0).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const currentScore = score?.current || completionRate;
  const chartData = activity.length
    ? activity.map((item) => ({ day: new Date(item.date).toLocaleDateString(undefined, { weekday: "short" }), score: item.score || 0, tasks: item.tasksCompleted || 0 }))
    : tasks.slice(-7).map((task, index) => ({ day: `T${index + 1}`, score: task.status === "done" ? 100 : task.status === "in_progress" ? 60 : 25, tasks: task.status === "done" ? 1 : 0 }));

  const objectives = [
    { title: "Complete assigned tasks", progress: completionRate, color: "bg-emerald-500" },
    { title: "Keep delayed tasks under control", progress: Math.max(0, 100 - overdueTasks * 20), color: "bg-rose-500" },
    { title: "Move active tasks to completion", progress: totalTasks ? Math.round(((completedTasks + inProgressTasks) / totalTasks) * 100) : 0, color: "bg-blue-500" },
  ];

  return (
    <ModuleLayout activeItem="performances">
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-gray-900">My Progress</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Live progress based on your assigned tasks and analytics activity.</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-lg shadow-purple-500/20">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">{score?.trend || "stable"}</span>
            </div>
            <h3 className="text-sm font-medium text-purple-100">Overall Score</h3>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-bold">{currentScore}</span>
              <span className="mb-1 text-purple-200">/ 100</span>
            </div>
            <p className="mt-4 flex items-center gap-1 text-sm text-purple-100">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              {score?.trendPct || 0}% trend
            </p>
          </div>

          <MetricCard title="Tasks terminées" value={`${completionRate}%`} subtitle={`${completedTasks}/${totalTasks} terminées`} icon={<Award className="h-6 w-6" />} tone="emerald" />
          <MetricCard title="Tasks en retard" value={String(overdueTasks)} subtitle="Needs attention" icon={<AlertCircle className="h-6 w-6" />} tone="rose" />
        </div>

        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-950">Progress trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#7c3aed" fill="#ede9fe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Presentation className="h-5 w-5 text-purple-600" />
              Current Objectives
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {objectives.map((okr) => (
              <div key={okr.title} className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{okr.title}</span>
                  <span className="text-sm font-semibold text-gray-700">{okr.progress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn("h-full rounded-full transition-all duration-1000", okr.color)} style={{ width: `${Math.min(100, Math.max(0, okr.progress))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function MetricCard({ title, value, subtitle, icon, tone }: { title: string; value: string; subtitle: string; icon: JSX.Element; tone: "emerald" | "rose" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn("rounded-lg p-2", tones[tone])}>{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {tone === "emerald" && <CheckCircle2 className="mb-1 h-5 w-5 text-emerald-500" />}
      </div>
    </div>
  );
}
