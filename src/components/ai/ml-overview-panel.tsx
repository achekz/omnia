import { AlertCircle, AlertTriangle, BrainCircuit, CheckCircle2, Info, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGenerateRecommendations, useMlInsights, useRunRiskPrediction } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MlOverviewPanelProps {
  title?: string;
  className?: string;
}

export function MlOverviewPanel({ title = "AI Intelligence", className }: MlOverviewPanelProps) {
  const { data: insights, isFetching, isError } = useMlInsights();
  const runRisk = useRunRiskPrediction();
  const generateRecommendations = useGenerateRecommendations();

  const rawRisk =
    insights?.latestPrediction?.riskScore ??
    Number(insights?.latestPrediction?.output?.risk_score || insights?.latestPrediction?.output?.riskScore || 0);
  const riskScore = rawRisk > 1 ? rawRisk / 100 : rawRisk;
  const riskPercent = Math.round(Math.max(0, Math.min(1, riskScore || 0)) * 100);
  const riskLevel = insights?.latestPrediction?.riskLevel || (riskPercent >= 70 ? "high" : riskPercent >= 40 ? "medium" : "low");
  const recommendations = insights?.latestRecommendation?.recommendations || [];
  const anomalies = insights?.anomalies || [];
  const riskMeta = getRiskMeta(riskLevel, riskPercent, anomalies.length);

  return (
    <section className={cn("rounded-3xl border border-gray-200 bg-white p-6 shadow-sm", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-950">{title}</h2>
          <p className="text-sm text-gray-500">Live ML score, suggestions and anomaly signals from backend.</p>
        </div>
        <div className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold capitalize", riskMeta.badge)}>
          {riskMeta.icon}
          {riskLevel} risk
        </div>
      </div>

      {isFetching && !insights ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl bg-gray-100" />
          <Skeleton className="h-16 rounded-2xl bg-gray-100" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load ML insights. You can still run a fresh prediction.
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Risk score</span>
              <span className="text-2xl font-bold text-gray-950">{riskPercent}%</span>
            </div>
            <Progress value={riskPercent} className={cn("h-3 bg-gray-200", riskMeta.progress)} />
            <div className={cn("mt-4 rounded-2xl border p-4 text-sm", riskMeta.explanationTone)}>
              <div className="mb-1 flex items-center gap-2 font-bold">
                {riskMeta.explanationIcon}
                Interpretation
              </div>
              <p>{riskMeta.explanation}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {riskMeta.factors.map((factor) => (
              <div key={factor} className="rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-600">
                <Info className="mb-2 h-4 w-4 text-gray-400" />
                {factor}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => runRisk.mutate()}
          disabled={runRisk.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {runRisk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
          Predict risk
        </button>
        <button
          type="button"
          onClick={() => generateRecommendations.mutate()}
          disabled={generateRecommendations.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {generateRecommendations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Recommend
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Recommendations</h3>
        {recommendations.length ? (
          recommendations.slice(0, 4).map((recommendation, index) => (
            <div key={`${recommendation}-${index}`} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm font-medium text-violet-950">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                Based on your past behavior
              </div>
              {recommendation}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">Run recommendations to generate personalized suggestions.</div>
        )}
      </div>

      {anomalies.length > 0 && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-bold">Anomaly alerts</span>
          </div>
          <p className="text-sm text-rose-700">{anomalies.length} anomaly signal(s) detected by ML.</p>
        </div>
      )}
    </section>
  );
}

function getRiskMeta(level: string, percent: number, anomalyCount: number) {
  if (level === "high" || percent >= 70) {
    return {
      badge: "bg-rose-50 text-rose-700",
      progress: "[&>div]:bg-rose-500",
      icon: <AlertTriangle className="h-4 w-4" />,
      explanationIcon: <AlertTriangle className="h-4 w-4" />,
      explanationTone: "border-rose-200 bg-rose-50 text-rose-700",
      explanation: anomalyCount
        ? "High risk because the model found anomaly signals and recent operational pressure."
        : "High risk because of recent delays, missed activity patterns or urgent workload concentration.",
      factors: ["Recent delays", "Workload pressure", "Anomaly signals"],
    };
  }

  if (level === "medium" || percent >= 40) {
    return {
      badge: "bg-amber-50 text-amber-700",
      progress: "[&>div]:bg-amber-500",
      icon: <AlertCircle className="h-4 w-4" />,
      explanationIcon: <AlertCircle className="h-4 w-4" />,
      explanationTone: "border-amber-200 bg-amber-50 text-amber-700",
      explanation: "Moderate risk: the model sees early warning signals, usually from pending work or uneven recent activity.",
      factors: ["Pending workload", "Recent score trend", "Deadline proximity"],
    };
  }

  return {
    badge: "bg-emerald-50 text-emerald-700",
    progress: "[&>div]:bg-emerald-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
    explanationIcon: <CheckCircle2 className="h-4 w-4" />,
    explanationTone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    explanation: "Low risk: recent behavior looks stable, with no critical anomaly or delay pattern detected.",
    factors: ["Stable activity", "Healthy completion rate", "No critical alert"],
  };
}
