import { useEffect, useMemo, useState } from "react";
import { AlertCircle, DollarSign, Plus, Receipt, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { MlOverviewPanel } from "@/components/ai/ml-overview-panel";
import { StatCard } from "@/components/ui/stat-card";
import { useDetectAnomaly, useGetFinanceRecords, useGetFinanceSummary, useGetTasks } from "@/lib/api-client";
import type { FinancialRecord, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function AccountantDashboard() {
  const { clearAllUsers } = useAuth(); // ✅ هنا

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
    [records]
  );

  const expenseRecords = useMemo(
    () => records.filter((record) => record.type === "expense"),
    [records]
  );

  const revenue = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const expenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0);

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="p-6 md:p-8">

        {/* ✅ زر الحذف */}
        <button
          onClick={clearAllUsers}
          className="mb-6 px-4 py-2 bg-red-600 text-white rounded"
        >
          🧹 Supprimer les comptes
        </button>

        <div className="mb-8 flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold">Comptable Workspace</h2>
            <p className="text-muted-foreground">
              Track finance activity and manage tasks
            </p>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded">
            <Plus className="w-5 h-5" />
            New Entry
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Revenue" value={currencyFormatter.format(revenue)} icon={<DollarSign />} />
          <StatCard title="Expenses" value={currencyFormatter.format(expenses)} icon={<Wallet />} />
          <StatCard title="Anomalies" value={summary?.anomalyCount || 0} icon={<AlertCircle />} />
        </div>

        {/* TASK BOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div key={col.id} className="border p-4 rounded">
                <h4>{col.title}</h4>

                {columnTasks.map((task, i) => (
                  <div key={i} className="p-2 border mt-2 rounded">
                    {task.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* CHART */}
        <div className="mt-8 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary?.byCategory || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </ModuleLayout>
  );
}