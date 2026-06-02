// Role du fichier: affiche une page reservee au compte admin.
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, CalendarClock, Clock3, Loader2, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGenerateWeeklyRecommendation, useGetWeeklyRecommendations } from "@/lib/api-client";
import type { WeeklyRecommendation, WeeklyRecommendationTrendPoint, WeeklyRecommendationUserScore } from "@/lib/types";
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

// Role: Prepare les donnees du graphique.
function buildChartData(account?: WeeklyRecommendationUserScore | null) {
  const trend = account?.trend || [];
  const taskDetails = account?.taskDetails || [];
  return trend.map((point) => {
    const tasksDone =
      point.tasksDone ??
      taskDetails.filter((task) => task.status === "done" && dayFromTaskDate(task.completedAt || task.dueDate) === point.day).length;
    const tasksLater =
      point.tasksLater ??
      taskDetails.filter((task) => task.status === "declined" && dayFromTaskDate(task.completedAt || task.dueDate) === point.day).length;
    const taskDelay =
      point.taskDelay ??
      taskDetails.filter((task) => task.isDelayed && dayFromTaskDate(task.completedAt || task.dueDate) === point.day).length;

    return {
      ...point,
      label: point.day,
      tasksDone,
      tasksLater,
      taskDelay,
      total:
        Number(point.present || 0) +
        Number(point.late || 0) +
        Number(point.absent || 0) +
        Number(tasksDone || 0) +
        Number(tasksLater || 0) +
        Number(taskDelay || 0),
    };
  });
}

// Role: Prepare une valeur pour l affichage ou l API.
function dayFromTaskDate(value?: string | null) {
  if (!value) return "";
  return String(new Date(value).getDate()).padStart(2, "0");
}

// Role: Retourne un etat booleen.
function sameAccount(a?: WeeklyRecommendationUserScore | null, b?: WeeklyRecommendationUserScore | null) {
  return Boolean(a && b && String(a.userId || a.email) === String(b.userId || b.email));
}

function scoreKey(account: WeeklyRecommendationUserScore) {
  return String(account.userId || account.email || account.name);
}

function numberValue(value?: number | null) {
  return Number(value || 0);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildGlobalAccounts(records: WeeklyRecommendation[]) {
  const accounts = new Map<string, WeeklyRecommendationUserScore>();

  records.forEach((record) => {
    (record.meta?.userScores || []).forEach((account) => {
      const key = scoreKey(account);
      if (!accounts.has(key)) {
        accounts.set(key, account);
      }
    });
  });

  return [...accounts.values()].sort((a, b) => numberValue(b.score) - numberValue(a.score));
}

// Role: Affiche et organise cet ecran.
export default function AdminRecommendationsPage() {
  const { data: records = [], isLoading } = useGetWeeklyRecommendations();
  const generateWeekly = useGenerateWeeklyRecommendation();
  const { toast } = useToast();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState("individual");

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const left = new Date(a.windowEnd || a.weekKey || a.createdAt || 0).getTime();
      const right = new Date(b.windowEnd || b.weekKey || b.createdAt || 0).getTime();
      return right - left;
    });
  }, [records]);

  const selectedRecord = useMemo(() => {
    if (viewMode === "all") return null;
    return sortedRecords.find((record) => record._id === selectedRecordId) || sortedRecords[0] || null;
  }, [selectedRecordId, sortedRecords, viewMode]);

  const ranking = selectedRecord?.meta?.userScores || [];
  const globalAccounts = useMemo(() => buildGlobalAccounts(sortedRecords), [sortedRecords]);
  const selectedAccount = useMemo(() => {
    return (
      ranking.find((entry) => String(entry.userId || entry.email) === selectedAccountKey) ||
      ranking.find((entry) => String(entry.userId || entry.email) === String(selectedRecord?.effectiveUser?.userId || selectedRecord?.effectiveUser?.email)) ||
      ranking[0] ||
      null
    );
  }, [ranking, selectedAccountKey, selectedRecord]);
  const chartData = useMemo(() => buildChartData(selectedAccount), [selectedAccount]);

  useEffect(() => {
    if (viewMode === "individual" && !selectedRecordId && sortedRecords[0]?._id) {
      setSelectedRecordId(sortedRecords[0]._id);
    }
  }, [selectedRecordId, sortedRecords, viewMode]);

  useEffect(() => {
    setSelectedAccountKey(null);
  }, [selectedRecordId]);

  const generateNow = async () => {
    try {
      const recommendation = await generateWeekly.mutateAsync(true);
      setSelectedRecordId(recommendation._id || null);
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

  const showAllRecommendations = () => {
    setViewMode("all");
    setSelectedRecordId(null);
    setSelectedAccountKey(null);
  };

  const backToIndividualView = () => {
    setViewMode("individual");
    setSelectedRecordId(sortedRecords[0]?._id || null);
  };

  const selectWeek = (id: string | null) => {
    setViewMode("individual");
    setSelectedRecordId(id);
  };

  return (
    <ModuleLayout activeItem="recommendations">
      <div className="p-3 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400">Admin AI</p>
            <h1 className="mt-2 text-2xl font-display font-bold text-gray-100 sm:text-3xl">Weekly Recommendations</h1>
            <p className="mt-1 text-sm text-gray-400">
              Newest Saturday first. Click a week and an account to inspect why it is efficient.
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
        ) : !sortedRecords.length ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900 p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-violet-400" />
            <h2 className="mt-4 text-xl font-bold text-gray-100">No weekly recommendation yet</h2>
            <p className="mt-2 text-sm text-gray-400">Use Generate now, or wait for Saturday at 10:00.</p>
          </div>
        ) : (
          <div className="grid gap-6 2xl:grid-cols-[260px_minmax(0,1fr)_390px]">
            <WeekHistory records={sortedRecords} selectedId={selectedRecord?._id} viewMode={viewMode} onAll={showAllRecommendations} onSelect={selectWeek} />

            {viewMode === "all" ? (
              <>
                <section className="space-y-6">
                  <GlobalSummary accounts={globalAccounts} />
                  <GlobalRecommendationsChart accounts={globalAccounts} />
                  <AccountRanking ranking={globalAccounts} selected={null} onSelect={() => undefined} />
                </section>

                <aside className="space-y-6">
                  <GlobalDetails accounts={globalAccounts} onBack={backToIndividualView} />
                </aside>
              </>
            ) : (
              <>
                <section className="space-y-6">
                  <HeroRecommendation record={selectedRecord!} account={selectedAccount} />
                  <TrendChart account={selectedAccount} data={chartData} />
                  <AccountRanking ranking={ranking} selected={selectedAccount} onSelect={(entry) => setSelectedAccountKey(String(entry.userId || entry.email))} />
                </section>

                <aside className="space-y-6">
                  <AccountDetails account={selectedAccount} />
                  <AiRecommendations record={selectedRecord!} />
                </aside>
              </>
            )}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche les anciennes recommandations triees.
function WeekHistory({
  records,
  selectedId,
  viewMode,
  onAll,
  onSelect,
}: {
  records: WeeklyRecommendation[];
  selectedId?: string;
  viewMode: string;
  onAll: () => void;
  onSelect: (id: string | null) => void;
}) {
  return (
    <aside className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <button
        onClick={onAll}
        className={cn(
          "mb-4 w-full rounded-xl border p-4 text-left transition",
          viewMode === "all" ? "border-violet-400 bg-violet-500/10" : "border-gray-800 bg-gray-950 hover:border-gray-700",
        )}
      >
        <p className="text-xs font-bold uppercase text-violet-300">Global view</p>
        <p className="mt-1 text-sm font-bold text-gray-100">All</p>
        <p className="mt-1 text-xs text-gray-400">All analyzed accounts</p>
      </button>
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-blue-300" />
        <h2 className="text-lg font-bold text-gray-100">Saturday history</h2>
      </div>
      <div className="space-y-3">
        {records.map((record) => (
          <button
            key={record._id || record.weekKey}
            onClick={() => onSelect(record._id || null)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition",
              record._id === selectedId ? "border-violet-400 bg-violet-500/10" : "border-gray-800 bg-gray-950 hover:border-gray-700",
            )}
          >
            <p className="text-xs font-bold uppercase text-gray-500">{formatDate(record.windowEnd)}</p>
            <p className="mt-1 text-sm font-bold text-gray-100">{record.effectiveUser?.name || "No winner"}</p>
            <p className="mt-1 text-xs text-gray-400">Score: {record.effectiveUser?.score ?? record.score ?? 0}/100</p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function GlobalSummary({ accounts }: { accounts: WeeklyRecommendationUserScore[] }) {
  const bestAccount = accounts[0] || null;
  const averageScore = Math.round(average(accounts.map((account) => numberValue(account.score))));

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gray-900 p-6 shadow-lg shadow-violet-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          <Award className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">All recommendations</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Global account overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailMetric label="Utilisateurs analysés" value={String(accounts.length)} />
            <DetailMetric label="Score moyen global" value={`${averageScore}/100`} />
            <DetailMetric label="Meilleur utilisateur" value={bestAccount?.name || "-"} />
            <DetailMetric label="Score maximum" value={`${bestAccount?.score ?? 0}/100`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalRecommendationsChart({ accounts }: { accounts: WeeklyRecommendationUserScore[] }) {
  const data = accounts.map((account) => ({
    name: account.name || account.email || "-",
    email: account.email || "",
    score: numberValue(account.score),
    role: roleLabel(String(account.role || "")),
  }));
  const chartWidth = Math.max(900, data.length * 92);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-100">Global recommendation scores</h2>
        <p className="mt-1 text-sm text-gray-400">Tous les comptes triés par score décroissant.</p>
      </div>

      <div className="overflow-x-auto">
        <div className="h-[360px]" style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 18, left: -20, bottom: 75 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" opacity={0.55} />
              <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 100]} />
              <Tooltip content={<GlobalTooltip />} />
              <Bar dataKey="score" fill="#8b5cf6" radius={[8, 8, 0, 0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function GlobalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const account = payload[0]?.payload || {};

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#25242d] px-4 py-3 shadow-xl">
      <p className="font-bold text-gray-100">{label}</p>
      {account.email ? <p className="mt-1 text-xs text-gray-400">{account.email}</p> : null}
      <p className="mt-2 font-semibold text-violet-300">score : {account.score || 0}/100</p>
      <p className="font-semibold text-gray-300">role : {account.role || "-"}</p>
    </div>
  );
}

function GlobalDetails({ accounts, onBack }: { accounts: WeeklyRecommendationUserScore[]; onBack: () => void }) {
  const totalUsers = accounts.length;
  const totalPresences = accounts.reduce((sum, account) => sum + numberValue(account.sessions ?? account.presentDays), 0);
  const totalLate = accounts.reduce((sum, account) => sum + numberValue(account.lateDays), 0);
  const totalAbsent = accounts.reduce((sum, account) => sum + numberValue(account.absentDays), 0);
  const totalTasksDone = accounts.reduce((sum, account) => sum + numberValue(account.tasksDone ?? account.completedTasks), 0);
  const averageEfficiency = Math.round(average(accounts.map((account) => numberValue(account.completionRate))));
  const averagePunctuality = Math.round(average(accounts.map((account) => numberValue(account.punctualityRate))));

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">Global statistics</h2>
          <p className="text-sm text-gray-500">All analyzed accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DetailMetric label="Total utilisateurs" value={String(totalUsers)} />
        <DetailMetric label="Présences totales" value={String(totalPresences)} />
        <DetailMetric label="Retards totaux" value={String(totalLate)} />
        <DetailMetric label="Absences totales" value={String(totalAbsent)} />
        <DetailMetric label="Tâches terminées" value={String(totalTasksDone)} />
        <DetailMetric label="Efficacité moyenne" value={`${averageEfficiency}%`} />
        <DetailMetric label="Ponctualité moyenne" value={`${averagePunctuality}%`} />
      </div>

      <button
        onClick={onBack}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
      >
        Back to Individual View
      </button>
    </div>
  );
}

// Role: Affiche le resume principal de la recommandation.
function HeroRecommendation({ record, account }: { record: WeeklyRecommendation; account?: WeeklyRecommendationUserScore | null }) {
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gray-900 p-6 shadow-lg shadow-violet-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          <Award className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Best account this Saturday</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{record.effectiveUser?.name || account?.name || "No account selected"}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">{record.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-gray-950 px-3 py-1 text-gray-300">{formatDate(record.windowEnd)}</span>
            <span className="rounded-full bg-gray-950 px-3 py-1 text-gray-300">Week: {record.weekKey || "-"}</span>
            <span className="rounded-full bg-gray-950 px-3 py-1 text-gray-300">Average: {record.meta?.averageScore ?? 0}/100</span>
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase text-emerald-300">Score</p>
          <p className="text-2xl font-black text-emerald-200">{record.effectiveUser?.score ?? account?.score ?? record.score ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

// Role: Affiche le graphique present late absent.
function TrendChart({ account, data }: { account?: WeeklyRecommendationUserScore | null; data: WeeklyRecommendationTrendPoint[] }) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [
      Number(point.present || 0),
      Number(point.late || 0),
      Number(point.absent || 0),
      Number(point.tasksDone || 0),
      Number(point.tasksLater || 0),
      Number(point.taskDelay || 0),
    ]),
  );

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-100">Monthly trend</h2>
        <p className="mt-1 text-sm text-gray-400">Présence, absences, retards, Plus tard et tâches faites pour {account?.name || "ce compte"}.</p>
      </div>

      <div className="h-[280px] sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" opacity={0.55} />
            <XAxis dataKey="label" stroke="#9ca3af" tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} domain={[0, Math.max(1, maxValue)]} />
            <Tooltip content={<TrendTooltip />} />
            <Area type="linear" dataKey="absent" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} name="absent" />
            <Area type="linear" dataKey="late" stroke="#f97316" fill="#f97316" fillOpacity={0.35} name="late" />
            <Area type="linear" dataKey="present" stroke="#10b981" fill="#10b981" fillOpacity={0.45} name="present" />
            <Area type="linear" dataKey="tasksLater" stroke="#a855f7" fill="#a855f7" fillOpacity={0.28} name="plus tard" />
            <Area type="linear" dataKey="taskDelay" stroke="#facc15" fill="#facc15" fillOpacity={0.22} name="retard tâche" />
            <Area type="linear" dataKey="tasksDone" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.28} name="tâches faites" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Role: Affiche le tooltip du graphique.
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(payload.map((entry: any) => [entry.dataKey, entry.value]));

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#25242d] px-4 py-3 shadow-xl">
      <p className="mb-2 font-bold text-gray-100">{label}</p>
      <p className="font-semibold text-emerald-400">present : {values.present || 0}</p>
      <p className="font-semibold text-orange-400">late : {values.late || 0}</p>
      <p className="font-semibold text-red-400">absent : {values.absent || 0}</p>
      <p className="font-semibold text-violet-300">plus tard : {values.tasksLater || 0}</p>
      <p className="font-semibold text-yellow-300">retard tâche : {values.taskDelay || 0}</p>
      <p className="font-semibold text-sky-300">tâches faites : {values.tasksDone || 0}</p>
    </div>
  );
}

// Role: Affiche le classement des comptes.
function AccountRanking({ ranking, selected, onSelect }: { ranking: WeeklyRecommendationUserScore[]; selected?: WeeklyRecommendationUserScore | null; onSelect: (entry: WeeklyRecommendationUserScore) => void }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-bold text-gray-100">Account effectiveness ranking</h2>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-gray-950 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Sessions</th>
              <th className="px-4 py-3">Late</th>
              <th className="px-4 py-3">Retard tâches</th>
              <th className="px-4 py-3">Plus tard</th>
              <th className="px-4 py-3">Faites</th>
              <th className="px-4 py-3">Efficiency</th>
              <th className="px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {ranking.map((entry, index) => (
              <RankingRow key={`${entry.userId || entry.email}-${index}`} entry={entry} index={index} active={sameAccount(entry, selected)} onClick={() => onSelect(entry)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Role: Affiche une ligne de classement.
function RankingRow({ entry, index, active, onClick }: { entry: WeeklyRecommendationUserScore; index: number; active: boolean; onClick: () => void }) {
  return (
    <tr onClick={onClick} className={cn("cursor-pointer text-gray-300 transition hover:bg-gray-800/70", active ? "bg-emerald-500/10" : "bg-gray-900")}>
      <td className="px-4 py-4 font-black text-gray-100">#{index + 1}</td>
      <td className="px-4 py-4">
        <p className="font-bold text-gray-100">{entry.name}</p>
        <p className="text-xs text-gray-500">{entry.email}</p>
      </td>
      <td className="px-4 py-4">{roleLabel(String(entry.role || ""))}</td>
      <td className="px-4 py-4">{entry.sessions ?? entry.presentDays ?? 0}</td>
      <td className="px-4 py-4">{entry.lateDays || 0}</td>
      <td className="px-4 py-4">{entry.taskDelay ?? entry.delayedTasks ?? 0}</td>
      <td className="px-4 py-4">{entry.tasksLater ?? entry.laterTasks ?? 0}</td>
      <td className="px-4 py-4">{entry.tasksDone ?? entry.completedTasks ?? 0}</td>
      <td className="px-4 py-4">{entry.completionRate ?? 0}%</td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-gray-800 px-3 py-1 font-bold text-white">{entry.score}/100</span>
      </td>
    </tr>
  );
}

// Role: Affiche les details du compte choisi.
function AccountDetails({ account }: { account?: WeeklyRecommendationUserScore | null }) {
  if (!account) {
    return <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">Select an account to inspect details.</div>;
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">{account.name}</h2>
          <p className="text-sm text-gray-500">{roleLabel(String(account.role || ""))} · {account.score}/100</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DetailMetric label="Séances" value={String(account.sessions ?? account.presentDays ?? 0)} />
        <DetailMetric label="Retards" value={String(account.lateDays || 0)} />
        <DetailMetric label="Retard tâches" value={String(account.taskDelay ?? account.delayedTasks ?? 0)} />
        <DetailMetric label="Plus tard" value={String(account.tasksLater ?? account.laterTasks ?? 0)} />
        <DetailMetric label="Absences" value={String(account.absentDays || 0)} />
        <DetailMetric label="Tâches finies" value={`${account.completedTasks || 0}/${account.activeTasks || 0}`} />
        <DetailMetric label="Efficacité" value={`${account.completionRate ?? 0}%`} />
        <DetailMetric label="Ponctualité" value={`${account.punctualityRate ?? 0}%`} />
      </div>

      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-violet-300" />
          <p className="text-sm font-bold text-gray-100">Pourquoi ce score ?</p>
        </div>
        <ul className="space-y-2 text-sm leading-6 text-gray-300">
          {(account.reasons || ["Details non disponibles pour cette ancienne recommandation."]).map((reason, index) => (
            <li key={`${reason}-${index}`} className="rounded-lg bg-gray-900 px-3 py-2">{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Role: Affiche une metrique compacte.
function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-950 px-4 py-3">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-black text-gray-100">{value}</p>
    </div>
  );
}

// Role: Affiche les recommandations IA.
function AiRecommendations({ record }: { record: WeeklyRecommendation }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-300" />
        <h2 className="text-lg font-bold text-gray-100">AI recommendations</h2>
      </div>
      <div className="space-y-3">
        {(record.recommendations || []).map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
