import { Award, CalendarClock, Loader2, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGenerateWeeklyRecommendation, useGetWeeklyRecommendations } from "@/lib/api-client";
import type { WeeklyRecommendation, WeeklyRecommendationUserScore } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Role: Prepare une valeur pour l affichage ou l API.
function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Role: Prepare une valeur pour l affichage ou l API.
function roleLabel(role?: string) {
  const labels: Record<string, string> = {
    employee: "Employé",
    stagiaire: "Stagiaire",
    comptable: "Comptable",
  };
  return labels[String(role || "").toLowerCase()] || role || "-";
}

// Role: Affiche et organise cet ecran.
export default function AdminRecommendationsPage() {
  const { data: records = [], isLoading } = useGetWeeklyRecommendations();
  const generateWeekly = useGenerateWeeklyRecommendation();
  const { toast } = useToast();
  const latest = records[0] || null;
  const ranking = latest?.meta?.userScores || [];

  const generateNow = async () => {
    try {
      await generateWeekly.mutateAsync(true);
      toast({
        title: "Recommendation generated",
        description: "Weekly effectiveness recommendation has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error?.response?.data?.message || "Could not generate recommendation.",
        variant: "destructive",
      });
    }
  };

  return (
    <ModuleLayout activeItem="recommendations">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Admin AI</p>
            <h1 className="mt-2 text-3xl font-display font-bold text-gray-100">Weekly Recommendations</h1>
            <p className="mt-1 text-sm text-gray-400">
              Generated every Saturday at 10:00 to compare account effectiveness for the current week.
            </p>
          </div>

          <button
            onClick={generateNow}
            disabled={generateWeekly.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generateWeekly.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate now
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">Loading recommendations...</div>
        ) : !latest ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900 p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-violet-400" />
            <h2 className="mt-4 text-xl font-bold text-gray-100">No weekly recommendation yet</h2>
            <p className="mt-2 text-sm text-gray-400">Use Generate now, or wait for Saturday at 10:00.</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-violet-500/30 bg-gray-900 p-6 shadow-lg shadow-violet-950/20">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Best account this week</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">{latest.effectiveUser?.name || "No account selected"}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{latest.summary}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-center">
                    <p className="text-xs font-bold uppercase text-emerald-300">Score</p>
                    <p className="text-2xl font-black text-emerald-200">{latest.effectiveUser?.score ?? latest.score ?? 0}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <Metric label="Week" value={latest.weekKey || "-"} />
                  <Metric label="Average" value={`${latest.meta?.averageScore ?? 0}/100`} />
                  <Metric label="Schedule" value="Saturday 10:00" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                  <h2 className="text-lg font-bold text-gray-100">Account effectiveness ranking</h2>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-950 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Done</th>
                        <th className="px-4 py-3">Late</th>
                        <th className="px-4 py-3">Presence</th>
                        <th className="px-4 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {ranking.map((entry, index) => (
                        <RankingRow key={`${entry.userId || entry.email}-${index}`} entry={entry} index={index} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                  <h2 className="text-lg font-bold text-gray-100">AI recommendations</h2>
                </div>
                <div className="space-y-3">
                  {(latest.recommendations || []).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-blue-300" />
                  <h2 className="text-lg font-bold text-gray-100">History</h2>
                </div>
                <div className="space-y-3">
                  {records.map((record) => (
                    <HistoryItem key={record._id || record.weekKey} record={record} active={record._id === latest._id} />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche une metrique compacte.
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-950 px-4 py-3">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-100">{value}</p>
    </div>
  );
}

// Role: Affiche une ligne de classement.
function RankingRow({ entry, index }: { entry: WeeklyRecommendationUserScore; index: number }) {
  return (
    <tr className={cn(index === 0 ? "bg-emerald-500/10" : "bg-gray-900", "text-gray-300")}>
      <td className="px-4 py-4 font-black text-gray-100">#{index + 1}</td>
      <td className="px-4 py-4">
        <p className="font-bold text-gray-100">{entry.name}</p>
        <p className="text-xs text-gray-500">{entry.email}</p>
      </td>
      <td className="px-4 py-4">{roleLabel(String(entry.role || ""))}</td>
      <td className="px-4 py-4">{entry.completedTasks || 0}/{entry.activeTasks || 0}</td>
      <td className="px-4 py-4">{entry.delayedTasks || 0}</td>
      <td className="px-4 py-4">{entry.punctualityRate ?? 0}%</td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-gray-800 px-3 py-1 font-bold text-white">{entry.score}/100</span>
      </td>
    </tr>
  );
}

// Role: Affiche une ancienne recommandation.
function HistoryItem({ record, active }: { record: WeeklyRecommendation; active: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", active ? "border-violet-400 bg-violet-500/10" : "border-gray-800 bg-gray-950")}>
      <p className="text-xs font-bold uppercase text-gray-500">{formatDate(record.windowStart)}</p>
      <p className="mt-1 text-sm font-bold text-gray-100">{record.effectiveUser?.name || "No winner"}</p>
      <p className="mt-1 text-xs text-gray-400">{record.summary}</p>
    </div>
  );
}
