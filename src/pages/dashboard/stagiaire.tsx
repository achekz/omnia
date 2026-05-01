import { ModuleLayout } from "@/components/layout/module-layout";
import { MlOverviewPanel } from "@/components/ai/ml-overview-panel";
import { CalendarClock } from "lucide-react";
import { useGetDashboardStats, useGetTasks } from "@/lib/api-client";

export default function StagiaireDashboard() {
  useGetDashboardStats(); // Used for prefetching, not rendered directly in this view
  const { data: tasks = [] } = useGetTasks();
  const examTasks = tasks
    .filter((task) => task.tags?.some((tag) => ["exam", "examen", "revision"].includes(tag.toLowerCase())) || task.title.toLowerCase().includes("exam"))
    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
  return (
    <ModuleLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white">Stagiaire Hub</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">AI Generated Study Plan</h3>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-medium">Optimized for retention</span>
          </div>
          
          <div className="space-y-4">
            {[
              { time: "09:00 AM", subject: "Calculus", topic: "Derivatives Review", duration: "90 min", status: "completed" },
              { time: "11:00 AM", subject: "Physics", topic: "Kinematics Practice", duration: "60 min", status: "current" },
              { time: "02:00 PM", subject: "Computer Science", topic: "Data Structures", duration: "120 min", status: "upcoming" },
              { time: "05:00 PM", subject: "Break", topic: "AI suggested rest", duration: "60 min", status: "upcoming" }
            ].map((session, i) => (
              <div key={i} className="flex items-stretch gap-4">
                <div className="w-20 text-right shrink-0 pt-3">
                  <span className="text-sm font-medium text-muted-foreground dark:text-gray-400">{session.time}</span>
                </div>
                <div className="relative flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-3.5 z-10 ${
                    session.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                    session.status === 'current' ? 'bg-primary shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'bg-white/20 dark:bg-white/10'
                  }`} />
                  {i !== 3 && <div className="w-0.5 h-full bg-white/10 dark:bg-white/20 absolute top-6" />}
                </div>
                <div className={`flex-1 p-4 rounded-xl border ${
                    session.status === 'current' ? 'bg-primary/5 border-primary/30 glow-shadow' : 'bg-card border-white/5'
                  }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-white">{session.subject}</span>
                    <span className="text-xs text-muted-foreground dark:text-gray-400 bg-background px-2 py-0.5 rounded">{session.duration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">{session.topic}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <MlOverviewPanel title="Study Risk AI" />

          <div className="glass-panel rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Exam reminders</h3>
            <div className="space-y-3">
              {examTasks.slice(0, 3).map((task) => (
                <div key={task._id || task.id} className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                  <div className="flex items-center gap-2 text-purple-200">
                    <CalendarClock className="h-4 w-4" />
                    <span className="font-semibold">{task.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}</p>
                </div>
              ))}
              {!examTasks.length && <p className="text-sm text-muted-foreground">No exam tasks yet. Add an exam task to activate revision alerts.</p>}
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
