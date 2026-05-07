import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FileCheck2,
  LineChart,
  ReceiptText,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useDetectAnomaly,
  useGenerateRecommendations,
  useGetFinanceRecords,
  useGetFinanceSummary,
  useRunRules,
} from "@/lib/api-client";
import type { FinancialRecord } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type RiskLevel = "Low" | "Medium" | "High";

interface FinanceSignal {
  revenue: number;
  expenses: number;
  balance: number;
  riskScore: number;
  riskLevel: RiskLevel;
  anomalyCount: number;
  anomalyRate: number;
  validationRate: number;
  revenueTrend: number;
  expenseTrend: number;
  nextBestAction: string;
  explanation: string;
  recommendations: string[];
}

const readableTitle = "text-gray-100";
const readableBody = "text-gray-200";
const readableLabel = "text-gray-300";
const glassSurface = "border-blue-200/15 bg-blue-950/35 backdrop-blur-md shadow-xl shadow-blue-950/20";
const nestedSurface = "border-blue-200/15 bg-indigo-950/30 backdrop-blur-md";

// Role: Decrit la logique clamp.
function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Role: Recupere les donnees necessaires.
function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

// Role: Recupere les donnees necessaires.
function getRecordId(record: FinancialRecord, index: number) {
  return record._id ?? record.id ?? `record-${index}`;
}

// Role: Retourne un etat booleen.
function isFlaggedRecord(record: FinancialRecord) {
  const recordWithBudget = record as FinancialRecord & { overBudget?: boolean };
  return Boolean(record.isAnomaly || (record.anomalyScore ?? 0) >= 70 || recordWithBudget.overBudget);
}

// Role: Construit des donnees derivees.
function deriveFinanceSignal(records: FinancialRecord[]): FinanceSignal {
  const incomeRecords = records.filter((record) => record.type === "income");
  const expenseRecords = records.filter((record) => record.type === "expense");
  const anomalies = records.filter(isFlaggedRecord);
  const revenue = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
  const expenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
  const balance = revenue - expenses;
  const anomalyRate = records.length ? clamp((anomalies.length / records.length) * 100) : 0;
  const riskScore = clamp(anomalyRate * 1.25 + (expenses > revenue ? 25 : 0) + anomalies.filter((record) => (record.anomalyScore ?? 0) >= 85).length * 8);
  const validationRate = records.length ? clamp(((records.length - anomalies.length) / records.length) * 100) : 100;
  const revenueTrend = clamp(revenue ? ((revenue - expenses) / Math.max(revenue, 1)) * 100 + 50 : 50);
  const expenseTrend = clamp(expenses ? (expenses / Math.max(revenue + expenses, 1)) * 100 : 0);
  const riskLevel = getRiskLevel(riskScore);
  const nextBestAction =
    anomalies.length > 0
      ? "Review flagged transaction"
      : validationRate < 80
        ? "Validate pending entries"
        : expenses > revenue
          ? "Check expense pressure"
          : "Monitor recent entries";

  return {
    revenue,
    expenses,
    balance,
    riskScore,
    riskLevel,
    anomalyCount: anomalies.length,
    anomalyRate,
    validationRate,
    revenueTrend,
    expenseTrend,
    nextBestAction,
    explanation:
      anomalies.length > 0
        ? `${anomalies.length} unusual transaction(s) need review. OmniAI detected abnormal amounts, possible budget pressure, or suspicious patterns.`
        : expenses > revenue
          ? "No severe anomaly is active, but expenses are above revenue and should be reviewed before validation."
          : "Financial activity is stable. No major inconsistency is currently visible in the latest entries.",
    recommendations: [
      anomalies.length ? "Review expense anomaly before closing the period." : "Validate clean entries to keep the ledger current.",
      "Check suspicious pattern across recent high-value transactions.",
      validationRate < 90 ? "Validate missing entries and rerun financial rules." : "Run anomaly detection after the next import.",
      expenses > revenue ? "Analyze expense trend before adding new commitments." : "Keep monitoring revenue and balance movement.",
    ],
  };
}

// Role: Affiche et organise cet ecran.
function HeroFinance({ signal }: { signal: FinanceSignal }) {
  const cards = [
    { label: "Revenue", value: formatCurrency(signal.revenue), icon: TrendingUp, className: "border-emerald-300/30 bg-emerald-500/10 text-emerald-50" },
    { label: "Expenses", value: formatCurrency(signal.expenses), icon: TrendingDown, className: "border-rose-300/30 bg-rose-500/10 text-rose-50" },
    { label: "Balance", value: formatCurrency(signal.balance), icon: Wallet, className: "border-blue-300/30 bg-blue-500/10 text-blue-50" },
    { label: "Risk", value: signal.riskLevel, icon: ShieldAlert, className: signal.riskLevel === "High" ? "border-rose-300/40 bg-rose-500/10 text-rose-50" : "border-emerald-300/30 bg-emerald-500/10 text-emerald-50" },
  ];

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.42),rgba(15,23,42,0.22)),linear-gradient(135deg,#047857_0%,#2563eb_52%,#0f172a_100%)] p-6 shadow-2xl shadow-blue-950/35">
      <div className="pointer-events-none absolute inset-0 bg-blue-950/20" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="mb-4 border-white/25 bg-blue-950/35 text-gray-100 shadow-sm shadow-blue-950/20 backdrop-blur-md hover:bg-blue-950/45">
            <BrainCircuit className="mr-1 h-3.5 w-3.5" />
            AI financial control center
          </Badge>
          <h1 className={cn("text-3xl font-display font-bold sm:text-4xl", readableTitle)}>Comptable Control Center</h1>
          <p className={cn("mt-3 max-w-xl text-sm leading-6", readableBody)}>
            OmniAI monitors entries, anomaly risk, and validation readiness in real time.
          </p>
        </div>
        <div className={cn("rounded-2xl p-4", glassSurface)}>
          <p className={cn("text-xs font-medium uppercase tracking-[0.2em]", readableLabel)}>Next best action</p>
          <p className={cn("mt-2 max-w-sm text-lg font-semibold leading-7", readableTitle)}>{signal.nextBestAction}</p>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={cn("rounded-2xl border p-4 transition hover:-translate-y-1 hover:border-white/35 hover:bg-blue-950/45", glassSurface, card.className)}>
            <div className="flex items-center justify-between">
              <span className={cn("text-xs font-semibold uppercase tracking-[0.16em]", readableLabel)}>{card.label}</span>
              <card.icon className="h-4 w-4" />
            </div>
            <p className={cn("mt-4 text-xl font-bold", readableTitle)}>{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function AIInsightFinance({ signal, onDetect }: { signal: FinanceSignal; onDetect: () => void }) {
  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge className="border-cyan-300/40 bg-cyan-400/15 text-cyan-50 shadow-sm shadow-cyan-950/20 hover:bg-cyan-400/20">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            AI Finance Insight
          </Badge>
          <h2 className={cn("mt-3 text-2xl font-bold", readableTitle)}>Financial risk and anomaly analysis</h2>
          <p className={cn("mt-2 text-sm leading-6", readableBody)}>{signal.explanation}</p>
        </div>
        <div className={cn("rounded-2xl p-4 text-center", nestedSurface)}>
          <p className={cn("text-xs uppercase tracking-[0.16em]", readableLabel)}>Risk score</p>
          <p className={cn("mt-2 text-4xl font-bold", signal.riskLevel === "High" ? "text-rose-200" : "text-emerald-200")}>{signal.riskScore}%</p>
          <Badge className="mt-2 border-rose-300/30 bg-rose-500/10 text-rose-50 font-semibold">{signal.anomalyCount} anomalies</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
        <div className={cn("rounded-2xl p-4", nestedSurface)}>
          <h3 className={cn("flex items-center gap-2 text-sm font-semibold", readableTitle)}>
            <LineChart className="h-4 w-4 text-blue-300" />
            Control signals
          </h3>
          <div className="mt-4 space-y-4">
            {[
              ["Anomaly rate", signal.anomalyRate],
              ["Validation rate", signal.validationRate],
              ["Expense pressure", signal.expenseTrend],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className={readableBody}>{label}</span>
                  <span className={cn("font-bold", readableTitle)}>{value}%</span>
                </div>
                <Progress value={value as number} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-emerald-300" />
              </div>
            ))}
          </div>
        </div>

        <div className={cn("rounded-2xl p-4", nestedSurface)}>
          <h3 className={cn("flex items-center gap-2 text-sm font-semibold", readableTitle)}>
            <SearchCheck className="h-4 w-4 text-emerald-300" />
            Recommendations
          </h3>
          <div className="mt-4 space-y-3">
            {signal.recommendations.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition hover:border-emerald-300/40 hover:bg-emerald-500/10">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-400/25 text-xs font-bold text-white">{index + 1}</span>
                <p className={cn("text-sm leading-6", readableBody)}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onDetect} className="mt-6 w-full rounded-xl border border-white/80 bg-[#F8FAFC] text-blue-950 shadow-lg shadow-blue-950/20 hover:bg-white hover:text-blue-950">
        <ShieldAlert className="h-4 w-4" />
        Detect anomalies
      </Button>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function SmartFinanceBoard({ records }: { records: FinancialRecord[] }) {
  const flagged = records.filter(isFlaggedRecord).slice(0, 5);
  const inProgress = records.filter((record) => !isFlaggedRecord(record) && record.type === "expense").slice(0, 5);
  const validated = records.filter((record) => !isFlaggedRecord(record) && record.type === "income").slice(0, 5);
  const columns = [
    { title: "To Review", records: flagged, icon: AlertTriangle, empty: "No flagged transactions.", tone: "text-rose-200" },
    { title: "In Progress", records: inProgress, icon: ReceiptText, empty: "No pending expense entries.", tone: "text-blue-200" },
    { title: "Validated", records: validated, icon: FileCheck2, empty: "No validated entries yet.", tone: "text-emerald-200" },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div>
        <h2 className={cn("text-2xl font-bold", readableTitle)}>Smart finance board</h2>
        <p className={cn("mt-1 text-sm", readableBody)}>Entries are grouped by anomaly flags, validation state, and rule-engine control signals.</p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className={cn("rounded-2xl p-4", nestedSurface)}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={cn("flex items-center gap-2 font-bold", readableTitle)}>
                <column.icon className={cn("h-4 w-4", column.tone)} />
                {column.title}
              </h3>
              <Badge className="border-white/20 bg-white/10 text-gray-100">{column.records.length}</Badge>
            </div>
            <div className="space-y-3">
              {column.records.length ? (
                column.records.map((record, index) => <FinanceRecordCard key={getRecordId(record, index)} record={record} />)
              ) : (
                <div className={cn("rounded-xl border border-dashed border-blue-200/20 p-4 text-center text-sm", readableBody)}>{column.empty}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function FinanceRecordCard({ record }: { record: FinancialRecord }) {
  const flagged = isFlaggedRecord(record);
  return (
    <article className="rounded-2xl border border-blue-200/15 bg-blue-950/25 p-4 transition hover:border-blue-300/40 hover:bg-blue-950/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className={cn("font-bold leading-snug", readableTitle)}>{record.description || record.category || "Financial entry"}</h4>
          <p className={cn("mt-1 text-xs font-semibold uppercase tracking-wide", readableLabel)}>{record.clientName || "Internal"} · {new Date(record.date).toLocaleDateString()}</p>
        </div>
        <p className={cn("font-bold", record.type === "income" ? "text-emerald-200" : "text-rose-200")}>
          {record.type === "income" ? "+" : "-"}{formatCurrency(record.amount)}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className={cn("border-white/20 bg-white/10 font-semibold capitalize", record.type === "income" ? "text-emerald-50" : "text-rose-50")}>{record.type}</Badge>
        {flagged && <Badge className="border-rose-300/40 bg-rose-500/10 text-rose-50 font-semibold">Anomaly</Badge>}
        <Badge className="border-blue-300/30 bg-blue-500/10 text-blue-50 font-semibold">
          AI: {flagged ? "Review before validation" : "Ready to validate"}
        </Badge>
      </div>
    </article>
  );
}

// Role: Affiche et organise cet ecran.
function FinanceActions({ onDetect, onRecommend, onRules, isScanning }: { onDetect: () => void; onRecommend: () => void; onRules: () => void; isScanning: boolean }) {
  const actions = [
    { label: isScanning ? "Scanning anomalies..." : "Detect anomalies", icon: ShieldAlert, onClick: onDetect, tone: "from-rose-500 to-amber-500" },
    { label: "Validate entries", icon: FileCheck2, onClick: onRules, tone: "from-emerald-500 to-blue-500" },
    { label: "Analyze financial trends", icon: BarChart3, onClick: onRecommend, tone: "from-blue-500 to-cyan-500" },
    { label: "Auto-check inconsistencies", icon: RefreshCw, onClick: onRules, tone: "from-indigo-500 to-blue-500" },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <h2 className={cn("text-xl font-bold", readableTitle)}>Smart actions</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick} className={cn("group rounded-2xl bg-gradient-to-br p-px text-left shadow-md shadow-blue-950/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/30", action.tone)}>
            <span className="flex h-full items-center gap-3 rounded-2xl border border-blue-200/15 bg-indigo-950/55 p-4 text-gray-100 backdrop-blur-md transition group-hover:border-white/30 group-hover:bg-blue-950/45">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition group-hover:bg-white/25">
                <action.icon className="h-5 w-5" />
              </span>
              <span className={cn("font-semibold", readableTitle)}>{action.label}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
function FinanceMetrics({ signal }: { signal: FinanceSignal }) {
  const metrics = [
    { label: "Revenue trend", value: signal.revenueTrend, icon: TrendingUp, detail: "balance strength" },
    { label: "Expense trend", value: signal.expenseTrend, icon: TrendingDown, detail: "spend pressure" },
    { label: "Anomaly rate", value: signal.anomalyRate, icon: AlertTriangle, detail: "flagged entries" },
    { label: "Validation rate", value: signal.validationRate, icon: CheckCircle2, detail: "clean entries" },
  ];

  return (
    <section className={cn("rounded-2xl p-6", glassSurface)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-bold", readableTitle)}>Finance metrics</h2>
          <p className={cn("mt-1 text-sm", readableBody)}>Financial control signals used by OmniAI.</p>
        </div>
        <Badge className="border-emerald-300/40 bg-emerald-500/10 text-emerald-50 font-semibold">Live</Badge>
      </div>
      <div className="mt-5 space-y-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-blue-300" />
                <span className={cn("text-sm font-semibold", readableTitle)}>{metric.label}</span>
              </div>
              <span className={cn("text-sm font-bold", readableTitle)}>{metric.value}%</span>
            </div>
            <Progress value={metric.value} className="h-2.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-emerald-300" />
            <p className={cn("mt-1 text-xs", readableLabel)}>{metric.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Role: Affiche et organise cet ecran.
export default function AccountantDashboard() {
  const { data: summary } = useGetFinanceSummary();
  const { data: records = [] } = useGetFinanceRecords();
  const detectAnomaly = useDetectAnomaly();
  const generateRecommendations = useGenerateRecommendations();
  const runRules = useRunRules();

  const signal = useMemo(() => {
    const derived = deriveFinanceSignal(records);
    return {
      ...derived,
      balance: summary?.balance ?? derived.balance,
      anomalyCount: summary?.anomalyCount ?? derived.anomalyCount,
    };
  }, [records, summary?.anomalyCount, summary?.balance]);

  // Role: Lance un traitement metier ou IA.
  const runAnomalyScan = () => {
    detectAnomaly.mutate(records.map((record) => record.amount));
  };

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="space-y-6 p-6 md:p-8">
        <HeroFinance signal={signal} />

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="space-y-6">
            <AIInsightFinance signal={signal} onDetect={runAnomalyScan} />
            <SmartFinanceBoard records={records} />
          </div>

          <div className="space-y-6">
            <FinanceActions
              onDetect={runAnomalyScan}
              onRecommend={() => generateRecommendations.mutate()}
              onRules={() => runRules.mutate()}
              isScanning={detectAnomaly.isPending}
            />
            <FinanceMetrics signal={signal} />
            <section className={cn("rounded-2xl p-6", glassSurface)}>
              <h2 className={cn("text-xl font-bold", readableTitle)}>Control summary</h2>
              <div className="mt-4 grid gap-3">
                <div className={cn("rounded-2xl p-4", nestedSurface)}>
                  <p className={cn("text-xs uppercase tracking-[0.16em]", readableLabel)}>Entries monitored</p>
                  <p className={cn("mt-2 text-2xl font-bold", readableTitle)}>{records.length}</p>
                </div>
                <div className={cn("rounded-2xl p-4", nestedSurface)}>
                  <p className={cn("text-xs uppercase tracking-[0.16em]", readableLabel)}>Net balance</p>
                  <p className={cn("mt-2 text-2xl font-bold", signal.balance >= 0 ? "text-emerald-200" : "text-rose-200")}>{formatCurrency(signal.balance)}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
