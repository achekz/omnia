import { useEffect, useState } from "react";
import { AlertCircle, CheckSquare, Flame } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { MLInsightCard } from "@/components/ui/ml-insight-card";
import { StatCard } from "@/components/ui/stat-card";
import { useGetDashboardStats, useGetTasks, useMlInsights } from "@/lib/api-client";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: serverTasks = [] } = useGetTasks();
  const { data: insights, isLoading: loadingInsights } = useMlInsights();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(serverTasks);
  }, [serverTasks]);

  const todoTasks = tasks.filter((task) => task.status === "todo");

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">My Workspace</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5" />
            <p className="text-sm font-medium text-muted-foreground z-10">Daily AI Score</p>
            <div className="mt-2 flex items-baseline gap-1 z-10">
              <span className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {stats?.currentScore || 92}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>

          <StatCard title="Tasks Done Today" value={stats?.completedTasks || 5} icon={<CheckSquare className="w-8 h-8 text-emerald-400" />} delay={0.1} />
          <StatCard title="Overdue Tasks" value={stats?.overdueTasks || 0} icon={<AlertCircle className="w-8 h-8 text-rose-400" />} delay={0.2} />
          <StatCard title="Day Streak" value={stats?.streak || 14} icon={<Flame className="w-8 h-8 text-amber-400" />} delay={0.3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-foreground mb-4">Task Board</h3>

            <div className="grid grid-cols-1">
              <div className="glass-panel rounded-xl border border-border flex flex-col min-h-[360px]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/40">
                  <h4 className="font-semibold text-foreground">To Do</h4>
                  <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">{todoTasks.length}</span>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {todoTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                      No admin tasks yet.
                    </div>
                  )}

                  {todoTasks.map((task, index) => {
                    const taskId = task._id || task.id || `todo-${index}`;

                    return (
                      <div
                        key={taskId}
                        className="bg-card border border-border hover:border-primary/30 p-4 rounded-xl shadow-sm transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                              task.priority === "high" || task.priority === "critical"
                                ? "bg-rose-500/20 text-rose-400"
                                : task.priority === "medium"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-blue-500/20 text-blue-400",
                            )}
                          >
                            {task.priority || "low"}
                          </span>
                        </div>
                        <h5 className="font-medium text-sm text-foreground mb-2 leading-tight">{task.title}</h5>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{task.description}</p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">AI Recommendations</h3>
            <div className="space-y-4">
              {insights?.latestRecommendation?.recommendations?.map((recommendation, index) => (
                <MLInsightCard
                  key={`${recommendation}-${index}`}
                  type="recommendation"
                  prediction={recommendation}
                  confidence={insights.latestRecommendation?.confidence || 85}
                />
              ))}
              {!loadingInsights && !insights?.latestRecommendation?.recommendations?.length && (
                <MLInsightCard
                  type="prediction"
                  prediction="Keep up the good work! We're analyzing your latest activity."
                  confidence={94}
                  className="border-primary/20 bg-primary/5"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
