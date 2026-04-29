import { useEffect, useMemo, useState } from "react";
import { AlertCircle, DollarSign, Plus, Receipt, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { MlOverviewPanel } from "@/components/ai/ml-overview-panel";
import { StatCard } from "@/components/ui/stat-card";
import { useDetectAnomaly, useGetFinanceRecords, useGetFinanceSummary, useGetTasks } from "@/lib/api-client";
import type { FinancialRecord, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function AccountantDashboard() {
  const { data: summary } = useGetFinanceSummary();
  const { data: records = [] } = useGetFinanceRecords();
  const { data: serverTasks = [] } = useGetTasks();
  const detectAnomaly = useDetectAnomaly();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(serverTasks);
  }, [serverTasks]);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: "todo", title: "To Review" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Completed" },
  ];

  const incomeRecords = useMemo(
    () => records.filter((record) => record.type === "income"),
    [records],
  );
  const expenseRecords = useMemo(
    () => records.filter((record) => record.type === "expense"),
    [records],
  );
  const revenue = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
  const expenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0);

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Comptable Workspace</h2>
            <p className="mt-2 text-muted-foreground">Track finance activity and manage your comptable tasks.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20">
            <Plus className="w-5 h-5" />
            New Entry
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center border-emerald-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5" />
            <p className="text-sm font-medium text-muted-foreground z-10">Current Balance</p>
            <div className="mt-2 z-10">
              <span className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                {currencyFormatter.format(summary?.balance || 0)}
              </span>
            </div>
          </div>

          <StatCard
            title="Revenue"
            value={currencyFormatter.format(revenue)}
            icon={<DollarSign className="w-8 h-8 text-emerald-400" />}
            delay={0.1}
          />
          <StatCard
            title="Expenses"
            value={currencyFormatter.format(expenses)}
            icon={<Wallet className="w-8 h-8 text-amber-400" />}
            delay={0.2}
          />
          <StatCard
            title="Anomalies"
            value={summary?.anomalyCount || 0}
            icon={<AlertCircle className="w-8 h-8 text-rose-400" />}
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-foreground mb-4">Accounting Task Board</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);

                return (
                  <div key={column.id} className="glass-panel rounded-xl border border-border flex flex-col min-h-[360px]">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/40">
                      <h4 className="font-semibold text-foreground">{column.title}</h4>
                      <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">{columnTasks.length}</span>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto space-y-3">
                      {columnTasks.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                          No accounting tasks in this column yet.
                        </div>
                      )}

                      {columnTasks.map((task, index) => {
                        const taskId = task._id || task.id || `${column.id}-${index}`;

                        return (
                          <div
                            key={taskId}
                            className="bg-card border border-border hover:border-emerald-500/30 p-4 rounded-xl shadow-sm transition-all"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                  task.priority === "high" || task.priority === "critical"
                                    ? "bg-rose-500/20 text-rose-400"
                                    : task.priority === "medium"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-emerald-500/20 text-emerald-400",
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
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <MlOverviewPanel title="Finance AI" />
            <button
              type="button"
              onClick={() => detectAnomaly.mutate(records.map((record) => record.amount))}
              disabled={detectAnomaly.isPending}
              className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {detectAnomaly.isPending ? "Scanning anomalies..." : "Detect anomalies"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {records.slice(0, 5).map((record: FinancialRecord, index) => (
                <div
                  key={record._id || record.id || `record-${index}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      record.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400",
                    )}>
                      {record.type === "income" ? <DollarSign className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{record.category || "General entry"}</p>
                      <p className="text-xs text-muted-foreground">{record.clientName || record.description || "Accounting record"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-semibold", record.type === "income" ? "text-emerald-400" : "text-amber-400")}>
                      {currencyFormatter.format(record.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {!records.length && (
                <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  No accounting records yet.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Budget vs actual</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.byCategory || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                  <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="budget" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {(summary?.byCategory || []).filter((item) => item.overBudget).map((item) => (
                <div key={item.category} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <strong>{item.category}</strong> is over budget: {currencyFormatter.format(item.total)}
                </div>
              ))}
              {!summary?.byCategory?.some((item) => item.overBudget) && (
                <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  No over-budget category detected.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
