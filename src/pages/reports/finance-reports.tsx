import { AlertTriangle, Download, FileText, PieChart, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useExportFinanceReport, useGetFinanceReport } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("fr-TN", {
  style: "currency",
  currency: "TND",
  maximumFractionDigits: 0,
});

export default function FinanceReportsPage() {
  const { data: report, isLoading } = useGetFinanceReport();
  const exportReport = useExportFinanceReport();
  const summary = report?.summary;

  const cards = [
    { label: "Income", value: currencyFormatter.format(summary?.totalIncome || 0), icon: <TrendingUp className="h-5 w-5" />, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Expenses", value: currencyFormatter.format(summary?.totalExpense || 0), icon: <TrendingDown className="h-5 w-5" />, tone: "text-rose-600 bg-rose-50" },
    { label: "Balance", value: currencyFormatter.format(summary?.balance || 0), icon: <PieChart className="h-5 w-5" />, tone: "text-violet-600 bg-violet-50" },
    { label: "Anomalies", value: String(summary?.anomalyCount || 0), icon: <AlertTriangle className="h-5 w-5" />, tone: "text-amber-600 bg-amber-50" },
  ];

  return (
    <ModuleLayout activeItem="reports">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-950">Finance Reports</h1>
              <p className="text-sm text-gray-500">Reports, anomalies, categories and export for comptables.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportReport.mutate("csv")}
              disabled={exportReport.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportReport.mutate("json")}
              disabled={exportReport.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Loading report...</div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase text-gray-400">{card.label}</p>
                    <span className={cn("rounded-xl p-2", card.tone)}>{card.icon}</span>
                  </div>
                  <p className="text-2xl font-black text-gray-950">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-gray-950">Monthly income and expenses</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary?.byMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-gray-950">Report status</h2>
                <div className="space-y-3">
                  <InfoRow label="Generated at" value={report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : "-"} />
                  <InfoRow label="Records" value={String(report?.totalRecords || 0)} />
                  <InfoRow label="Anomaly rate" value={`${report?.anomalyRate || 0}%`} />
                  <InfoRow label="Top category" value={report?.topCategory?.category || "-"} />
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-950">Recent records</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Client</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Anomaly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.records || []).slice(0, 20).map((record) => (
                      <tr key={record._id || record.id} className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="py-3 pr-4 font-medium text-gray-950">{record.clientName || "-"}</td>
                        <td className="py-3 pr-4">{record.category || "General"}</td>
                        <td className="py-3 pr-4 capitalize">{record.type}</td>
                        <td className="py-3 pr-4 font-bold">{currencyFormatter.format(record.amount)}</td>
                        <td className="py-3 pr-4">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", record.isAnomaly ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                            {record.isAnomaly ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!report?.records?.length && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">No finance records yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </ModuleLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm font-semibold text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-950">{value}</span>
    </div>
  );
}
