import { ModuleLayout } from "@/components/layout/module-layout";
import { StatCard } from "@/components/ui/stat-card";
import { MLInsightCard } from "@/components/ui/ml-insight-card";
import { Clock, Wallet, CheckCircle } from "lucide-react";
import { useGetDashboardStats } from "@/lib/api-client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function StudentDashboard() {
  useGetDashboardStats(); // Used for prefetching, not rendered directly in this view

  const budgetData = [
    { name: 'Rent & Utilities', value: 800, color: 'hsl(var(--primary))' },
    { name: 'Food', value: 300, color: 'hsl(var(--accent))' },
    { name: 'Transport', value: 100, color: 'hsl(var(--chart-3))' },
    { name: 'Study Materials', value: 150, color: 'hsl(var(--chart-4))' },
    { name: 'Entertainment', value: 200, color: 'hsl(var(--chart-5))' },
  ];

  return (
    <ModuleLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white">Student Hub</h2>
        <p className="text-muted-foreground mt-1">AI-powered study planning and budget management.</p>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center border border-accent/30 bg-accent/5">
          <p className="text-sm font-medium text-accent">Next Exam In</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-display font-bold text-white">12</span>
            <span className="text-muted-foreground">days</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Advanced Calculus</p>
        </div>
        
        <StatCard
          title="Study Hours (Week)"
          value="24.5"
          icon={<Clock className="w-8 h-8 text-primary" />}
          trend={15}
          delay={0.1}
        />
        <StatCard
          title="Budget Used"
          value="68%"
          icon={<Wallet className="w-8 h-8 text-rose-400" />}
          trend={-5}
          delay={0.2}
        />
        <StatCard
          title="Task Completion"
          value="94%"
          icon={<CheckCircle className="w-8 h-8 text-emerald-400" />}
          trend={2}
          delay={0.3}
        />
      </div>

      {/* Row 2: Study Plan & Insights */}
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
                  <span className="text-sm font-medium text-muted-foreground">{session.time}</span>
                </div>
                <div className="relative flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-3.5 z-10 ${
                    session.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                    session.status === 'current' ? 'bg-primary shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'bg-white/20'
                  }`} />
                  {i !== 3 && <div className="w-0.5 h-full bg-white/10 absolute top-6" />}
                </div>
                <div className={`flex-1 p-4 rounded-xl border ${
                    session.status === 'current' ? 'bg-primary/5 border-primary/30 glow-shadow' : 'bg-card border-white/5'
                  }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-white">{session.subject}</span>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">{session.duration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{session.topic}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Budget Tracker</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value}`}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <MLInsightCard 
            type="recommendation"
            prediction="Shift heavy study sessions to morning. Your retention drops 40% after 4 PM based on quiz scores."
            confidence={92}
            factors={["Quiz performance", "Study logs"]}
          />
        </div>
      </div>
    </ModuleLayout>
  );
}
