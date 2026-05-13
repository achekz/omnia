// Role du fichier: affiche un tableau de bord adapte au profil cabinet.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, CheckCircle2, Users2 } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { StatCard } from "@/components/ui/stat-card";
import { useGetDashboardStats } from "@/lib/api-client";

// Role: Affiche et organise cet ecran.
export default function CabinetDashboard() {
  const { data: stats } = useGetDashboardStats();
  const activity = stats?.weeklyActivity?.length ? stats.weeklyActivity : [];

  return (
    <ModuleLayout>
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-gray-950 dark:text-white">Cabinet Dashboard</h2>
          <p className="mt-1 text-muted-foreground dark:text-gray-400">Team activity, tasks, and AI operational signals.</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Team Size" value={stats?.teamSize || 0} icon={<Users2 className="h-8 w-8 text-primary" />} delay={0.1} />
          <StatCard title="Active Projects" value={stats?.activeProjects || 0} icon={<Activity className="h-8 w-8 text-accent" />} delay={0.2} />
          <StatCard title="Completed Tasks" value={stats?.completedTasks || 0} icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />} delay={0.3} />
          <StatCard title="Overdue Tasks" value={stats?.overdueTasks || 0} icon={<AlertTriangle className="h-8 w-8 text-amber-400" />} delay={0.4} />
        </div>

        <div className="glass-panel rounded-2xl border border-white/5 p-6">
          <h3 className="mb-6 text-lg font-semibold text-gray-950 dark:text-white">Weekly Activity</h3>
          <div className="h-[300px] w-full">
            {activity.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(148,163,184,0.8)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(148,163,184,0.8)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                  <Bar dataKey="value" name="Activity score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground dark:text-gray-400">No activity data yet.</div>
            )}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
