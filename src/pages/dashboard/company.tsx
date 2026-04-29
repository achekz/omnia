import { Line, LineChart, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Briefcase, CheckCircle2, Minus, Users } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { MlOverviewPanel } from "@/components/ai/ml-overview-panel";
import { StatCard } from "@/components/ui/stat-card";
import { useGetDashboardStats, useGetTeamMembers } from "@/lib/api-client";
import type { TeamMemberSummary } from "@/lib/types";
import { cn, getRiskColor } from "@/lib/utils";

export default function CompanyDashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: teamMembers = [], isLoading: teamLoading } = useGetTeamMembers();

  return (
    <ModuleLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white">Company Overview</h2>
        <p className="text-muted-foreground dark:text-gray-400 mt-1">Monitor your team&apos;s performance and AI insights.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Employees" value={stats?.teamSize || 24} icon={<Users className="w-8 h-8 text-primary" />} trend={12} trendLabel="vs last month" delay={0.1} />
        <StatCard title="Active Projects" value={stats?.activeProjects || 8} icon={<Briefcase className="w-8 h-8 text-accent" />} trend={5} trendLabel="vs last month" delay={0.2} />
        <StatCard title="Avg Productivity Score" value={`${stats?.currentScore || 85}%`} icon={<Activity className="w-8 h-8 text-indigo-400" />} trend={-2} trendLabel="vs last week" delay={0.3} />
        <StatCard title="Active Alerts" value={stats?.anomaliesDetected || 3} icon={<AlertTriangle className="w-8 h-8 text-rose-400" />} delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-6">Team Performance This Week</h3>
          <div className="h-80 w-full">
            {stats?.weeklyActivity?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground dark:text-gray-400">Loading chart...</div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Top Performers</h3>
          <div className="space-y-4 flex-1">
            {!teamLoading &&
              teamMembers.slice(0, 5).map((teamData: TeamMemberSummary, index) => {
                const member = teamData.member;
                const memberId = member._id ?? member.id ?? `member-${index}`;

                return (
                  <div key={memberId} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/10">
                        <img
                          src={`https://images.unsplash.com/photo-${1535713875002 + index}-d1d0cf377fde?w=100&h=100&fit=crop`}
                          alt={member.name || "Team member"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">{member.name}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{teamData.avgScore || 0}%</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <MlOverviewPanel title="Company AI Risk Overview" />
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">AI Behavioral Risk Analysis</h3>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Real-time burnout and churn prediction based on activity.</p>
          </div>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">View All</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks Done</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {teamMembers.map((teamData: TeamMemberSummary, index) => {
                const member = teamData.member;
                const memberId = member._id ?? member.id ?? `row-${index}`;

                return (
                  <tr key={memberId} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">{teamData.tasksCompleted || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-rose-400">{0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full border", getRiskColor("low"))}>LOW</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.isActive !== false ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Minus className="w-3.5 h-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!teamMembers.length && !teamLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
