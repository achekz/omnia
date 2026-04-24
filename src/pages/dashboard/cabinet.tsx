import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, FileText, ShieldAlert, Users2 } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { StatCard } from "@/components/ui/stat-card";
import { AnomalyAlert } from "@/components/ui/anomaly-alert";
import { useGetFinanceRecords, useGetFinanceSummary } from "@/lib/api-client";
import type { FinancialRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function CabinetDashboard() {
  const { data: summary } = useGetFinanceSummary();
  const { data: records = [], isLoading: recLoading } = useGetFinanceRecords();

  const anomalies = records.filter((record) => record.isAnomaly);

  return (
    <ModuleLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white">Cabinet Dashboard</h2>
        <p className="text-muted-foreground dark:text-gray-400 mt-1">Financial overview, anomalies, and client tracking.</p>
      </div>

      {anomalies.length > 0 && (
        <div className="mb-6 space-y-3">
          {anomalies.slice(0, 2).map((anomaly: FinancialRecord) => (
            <AnomalyAlert
              key={anomaly._id ?? anomaly.id}
              score={anomaly.anomalyScore || 90}
              message={`Unusual transaction detected for client "${anomaly.clientName}": ${formatCurrency(anomaly.amount)} in ${anomaly.category}. AI suggests review.`}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Clients" value={42} icon={<Users2 className="w-8 h-8 text-primary" />} trend={8} trendLabel="vs last month" delay={0.1} />
        <StatCard title="Net Balance" value={formatCurrency(summary?.balance || 125000)} icon={<DollarSign className="w-8 h-8 text-accent" />} trend={15} trendLabel="vs last month" delay={0.2} />
        <StatCard title="Anomalies Detected" value={summary?.anomalyCount || anomalies.length || 0} icon={<ShieldAlert className="w-8 h-8 text-rose-400" />} trend={-50} trendLabel="vs last week" delay={0.3} />
        <StatCard title="Pending Declarations" value={12} icon={<FileText className="w-8 h-8 text-amber-400" />} delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-6">Monthly Financial Flow</h3>
          <div className="h-[300px] w-full">
            {summary?.byMonth?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value / 1000}k`} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground dark:text-gray-400">Loading chart...</div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!recLoading &&
              records.map((record: FinancialRecord) => (
                <div key={record._id ?? record.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors">
                  <div>
                    <p className="font-medium text-white">{record.description || record.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground dark:text-gray-400">{record.clientName}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-xs text-muted-foreground dark:text-gray-400">{new Date(record.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${record.type === "income" ? "text-accent" : "text-rose-400"}`}>
                      {record.type === "income" ? "+" : "-"}
                      {formatCurrency(record.amount)}
                    </p>
                    {record.isAnomaly && (
                      <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded mt-1 inline-block">
                        Anomaly
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
