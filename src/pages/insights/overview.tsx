import { AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/useAuth";
import { useGenerateInsightOverview, useGetInsightOverview } from "@/lib/api-client";
import type { InsightAnalysisItem, InsightKpi, InsightRecommendation } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusTone = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-gray-200 bg-gray-50 text-gray-800",
};

const priorityTone = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

// Role: Affiche et organise cet ecran.
export default function InsightOverviewPage() {
  const { user } = useAuth();
  const { data: snapshot, isFetching } = useGetInsightOverview({ query: { refetchInterval: 60000 } });
  const generate = useGenerateInsightOverview();
  const canGenerate = user?.role === "admin" || user?.profileType === "admin";
  const kpis = snapshot?.kpis || [];
  const chartData = kpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
  }));

  return (
    <ModuleLayout activeItem="insights">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-950 dark:text-gray-100">AI Insights</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">KPIs, recommandations et analyse automatique des données générés par le system.</p>
            </div>
          </div>

          {canGenerate ? (
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Générer l'analyse
            </button>
          ) : (
            <div className="rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              Mode consultation
            </div>
          )}
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-950 dark:text-gray-100">Aperçu de l'analyse automatique</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{snapshot?.summary || "The system will generate an analysis from tasks, attendance, finance and activity logs."}</p>
            </div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {snapshot?.createdAt ? `Generated ${new Date(snapshot.createdAt).toLocaleString()}` : isFetching ? "Loading..." : "No snapshot yet"}
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.length ? kpis.map((item) => <KpiCard key={item.key} item={item} />) : <EmptyState label="Aucun KPI généré pour le moment." />}
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-bold text-gray-950 dark:text-gray-100">Graphique des KPIs</h2>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-gray-950 dark:text-gray-100">Analyse automatique</h2>
            </div>
            <div className="space-y-3">
              {(snapshot?.analysis || []).length ? snapshot?.analysis.map((item, index) => <AnalysisCard key={`${item.metric}-${index}`} item={item} />) : <EmptyState label="No analysis generated yet." />}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-bold text-gray-950 dark:text-gray-100">Recommendations IA</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {(snapshot?.recommendations || []).length
              ? snapshot?.recommendations.map((item, index) => <RecommendationCard key={`${item.title}-${index}`} item={item} />)
              : <EmptyState label="No recommendations generated yet." />}
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function KpiCard({ item }: { item: InsightKpi }) {
  return (
    <div className={cn("rounded-lg border p-4 shadow-sm", statusTone[item.status || "neutral"])}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{item.label}</p>
        {item.status === "good" ? <CheckCircle2 className="h-4 w-4" /> : item.status === "critical" ? <AlertTriangle className="h-4 w-4" /> : null}
      </div>
      <p className="text-3xl font-bold">
        {item.value}
        <span className="ml-1 text-base">{item.unit}</span>
      </p>
      <p className="mt-3 text-xs font-medium opacity-80">{item.description}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function AnalysisCard({ item }: { item: InsightAnalysisItem }) {
  const tone = item.severity === "critical" ? "border-rose-200 bg-rose-50 text-rose-800" : item.severity === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={cn("rounded-lg border p-4", tone)}>
      <p className="font-bold">{item.title}</p>
      <p className="mt-2 text-sm leading-6">{item.message}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function RecommendationCard({ item }: { item: InsightRecommendation }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-bold text-gray-950 dark:text-gray-100">{item.title}</p>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold capitalize", priorityTone[item.priority])}>{translatePriority(item.priority)}</span>
      </div>
      <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{item.message}</p>
      <p className="mt-3 text-xs font-semibold uppercase text-gray-400">{item.source || "system"}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm font-semibold text-gray-500 dark:border-gray-700">
      {label}
    </div>
  );
}

// Role: Prepare une valeur pour l affichage ou l API.
function translatePriority(priority: InsightRecommendation["priority"]) {
  if (priority === "high") return "élevée";
  if (priority === "medium") return "moyenne";
  return "faible";
}
