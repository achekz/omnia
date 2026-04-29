import { AlertTriangle, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetFinanceRecords, useGetFinanceSummary } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function BudgetPage() {
  const { data: summary } = useGetFinanceSummary();
  const { data: records = [] } = useGetFinanceRecords();

  const budgetCards = [
    { title: "Income", value: currencyFormatter.format(summary?.totalIncome || 0), icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
    { title: "Expenses", value: currencyFormatter.format(summary?.totalExpense || 0), icon: <TrendingDown className="w-5 h-5 text-rose-500" /> },
    { title: "Balance", value: currencyFormatter.format(summary?.balance || 0), icon: <PiggyBank className="w-5 h-5 text-indigo-600" /> },
  ];

  return (
    <ModuleLayout activeItem="budget">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">Finance & Budget</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Live transactions, budget usage and over-budget alerts from the backend finance module.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {budgetCards.map((card) => (
            <div key={card.title} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</h2>
                {card.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget vs actual</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.byCategory || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                  <Bar dataKey="total" name="Actual" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="budget" name="Budget" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Over-budget alerts</h2>
            <div className="space-y-3">
              {(summary?.byCategory || []).filter((item) => item.overBudget).map((item) => (
                <div key={item.category} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    {item.category}
                  </div>
                  <p className="mt-1 text-sm">Actual {currencyFormatter.format(item.total)} exceeds budget {currencyFormatter.format(item.budget || 0)}.</p>
                </div>
              ))}
              {!summary?.byCategory?.some((item) => item.overBudget) && (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                  No over-budget category detected.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Transactions overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Description</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record._id || record.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{record.category || "General"}</td>
                    <td className="py-3 pr-4 text-gray-500">{record.description || record.clientName || "Transaction"}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", record.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                        {record.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-semibold">{currencyFormatter.format(record.amount)}</td>
                    <td className="py-3 pr-4 text-gray-500">{new Date(record.date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!records.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No transactions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
}
