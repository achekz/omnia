import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useDeleteRule, useGetRules, useRunRules, useSaveRule } from "@/lib/api-client";
import type { Rule, RuleMetric, RuleOperator } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const metricOptions: { value: RuleMetric; label: string }[] = [
  { value: "task.delayDays", label: "Jours de retard de la tâche" },
  { value: "task.priorityScore", label: "Score de priorité de la tâche" },
  { value: "task.status", label: "Statut de la tâche" },
  { value: "finance.expensesThisMonth", label: "Dépenses mensuelles" },
  { value: "finance.balanceThisMonth", label: "Solde mensuel" },
  { value: "finance.recordAmount", label: "Montant de la transaction" },
];

const operatorOptions: { value: RuleOperator; label: string }[] = [
  { value: "gt", label: "supérieur à" },
  { value: "gte", label: "supérieur ou égal à" },
  { value: "lt", label: "inférieur à" },
  { value: "lte", label: "inférieur ou égal à" },
  { value: "eq", label: "égal à" },
  { value: "neq", label: "différent de" },
];

const redirectTargetOptions = [
  { value: "/tasks", label: "Page tâches" },
  { value: "/dashboard", label: "Tableau de bord" },
  { value: "/tasks/{taskId}", label: "Tâche spécifique (dynamique)" },
  { value: "/notifications", label: "Page notifications" },
] as const;

const emptyForm: Rule = {
  name: "",
  description: "",
  trigger: "scheduled",
  resource: "task",
  roles: ["employee"],
  conditions: [{ metric: "task.delayDays", operator: "gt", value: 2 }],
  action: {
    type: "notify",
    target: "assignedUser",
    severity: "warning",
    title: "",
    message: "",
    redirectTarget: "/tasks",
    actionUrl: "/tasks",
  },
  redirectTarget: "/tasks",
  isActive: true,
  cooldownMinutes: 60,
};

export default function RuleEnginePage() {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useGetRules();
  const saveRule = useSaveRule();
  const deleteRule = useDeleteRule();
  const runRules = useRunRules();
  const [form, setForm] = useState<Rule>(emptyForm);
  const [executionLogs, setExecutionLogs] = useState<Array<{ id: string; timestamp: string; rulesEvaluated: number; triggeredCount: number }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("omni_rule_engine_logs") || "[]");
    } catch {
      return [];
    }
  });

  const activeCount = useMemo(() => rules.filter((rule) => rule.isActive !== false).length, [rules]);

  function resetForm() {
    setForm(emptyForm);
  }

  function editRule(rule: Rule) {
    const redirectTarget = rule.redirectTarget || rule.action?.redirectTarget || rule.action?.actionUrl || emptyForm.redirectTarget;
    setForm({
      ...emptyForm,
      ...rule,
      conditions: rule.conditions?.length ? rule.conditions : emptyForm.conditions,
      redirectTarget,
      action: { ...emptyForm.action, ...rule.action, redirectTarget, actionUrl: redirectTarget },
      roles: rule.roles?.length ? rule.roles : [],
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.action.title.trim() || !form.action.message.trim()) {
      toast({
        title: "Règle incomplète",
        description: "Le nom, le titre de notification et le message sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveRule.mutateAsync(form);
      toast({
        title: form._id || form.id ? "Règle mise à jour" : "Règle créée",
        description: "La règle d'automatisation est enregistrée dans MongoDB.",
      });
      resetForm();
    } catch {
      toast({
        title: "Échec de l'enregistrement",
        description: "Impossible d'enregistrer cette règle pour le moment.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(rule: Rule) {
    const id = rule._id || rule.id;
    if (!id) return;

    try {
      await deleteRule.mutateAsync(id);
      toast({ title: "Règle supprimée", description: "La règle a été retirée." });
    } catch {
      toast({
        title: "Suppression échouée",
        description: "Impossible de supprimer cette règle.",
        variant: "destructive",
      });
    }
  }

  async function handleRunRules() {
    try {
      const result = await runRules.mutateAsync();
      const nextLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        rulesEvaluated: result.rulesEvaluated || 0,
        triggeredCount: result.triggeredCount || 0,
      };
      const nextLogs = [nextLog, ...executionLogs].slice(0, 8);
      setExecutionLogs(nextLogs);
      localStorage.setItem("omni_rule_engine_logs", JSON.stringify(nextLogs));
      toast({
        title: "Moteur de règles exécuté",
        description: `${result.rulesEvaluated || 0} règles vérifiées, ${result.triggeredCount || 0} alertes déclenchées.`,
      });
    } catch {
      toast({
        title: "Échec du moteur de règles",
        description: "Impossible d'exécuter les règles pour le moment.",
        variant: "destructive",
      });
    }
  }

  const condition = form.conditions[0] || emptyForm.conditions[0];

  return (
    <ModuleLayout activeItem="rules">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Automatisation</p>
            <h1 className="mt-2 text-3xl font-display font-bold text-gray-950">Moteur de règles</h1>
            <p className="mt-2 max-w-2xl text-gray-500">
              Créez des règles SI/ALORS qui déclenchent des notifications en temps réel pour les retards, alertes budget et risques opérationnels.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRunRules()}
            disabled={runRules.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-60"
          >
            {runRules.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Exécuter les règles
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <RuleStat label="Règles actives" value={activeCount} />
          <RuleStat label="Total des règles" value={rules.length} />
          <RuleStat label="Dernière exécution" value={runRules.data?.triggeredCount ?? 0} suffix="alertes" />
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-950">{form._id || form.id ? "Modifier la règle" : "Créer une règle"}</h2>
                <p className="text-sm text-gray-500">Construisez une condition SI et une action de notification ALORS.</p>
              </div>
              <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <Plus className="mr-1 inline h-4 w-4" />
                Nouvelle
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Nom de la règle">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-input" placeholder="Task delay > 2 days" />
              </Field>

              <Field label="Description">
                <textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className="form-input min-h-[90px]" placeholder="Expliquez ce que cette automatisation surveille." />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Déclencheur">
                  <select value={form.trigger} onChange={(event) => setForm({ ...form, trigger: event.target.value as Rule["trigger"] })} className="form-input">
                    <option value="scheduled">Planifié</option>
                    <option value="task">Tâche</option>
                    <option value="finance">Finance</option>
                    <option value="manual">Manuel</option>
                  </select>
                </Field>
                <Field label="Ressource">
                  <select
                    value={form.resource}
                    onChange={(event) => {
                      const resource = event.target.value as Rule["resource"];
                      setForm({
                        ...form,
                        resource,
                        action: {
                          ...form.action,
                          target: resource === "finance" && form.action.target === "assignedUser" ? "creator" : form.action.target,
                        },
                      });
                    }}
                    className="form-input"
                  >
                    <option value="task">Tâche</option>
                    <option value="finance">Finance</option>
                    <option value="stagiaire">Stagiaire</option>
                  </select>
                </Field>
                <Field label="Délai entre alertes">
                  <input type="number" min={0} value={form.cooldownMinutes || 0} onChange={(event) => setForm({ ...form, cooldownMinutes: Number(event.target.value) })} className="form-input" />
                </Field>
              </div>

              <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <Zap className="h-3.5 w-3.5" />
                  Condition SI
                </p>
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.8fr]">
                  <select value={condition.metric} onChange={(event) => setForm({ ...form, conditions: [{ ...condition, metric: event.target.value as RuleMetric }] })} className="form-input">
                    {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={condition.operator} onChange={(event) => setForm({ ...form, conditions: [{ ...condition, operator: event.target.value as RuleOperator }] })} className="form-input">
                    {operatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input value={String(condition.value)} onChange={(event) => setForm({ ...form, conditions: [{ ...condition, value: event.target.value }] })} className="form-input" placeholder="2" />
                </div>
                <p className="mt-3 text-sm font-medium text-violet-800">
                  SI <strong>{labelForMetric(condition.metric)}</strong> est <strong>{labelForOperator(condition.operator)}</strong> <strong>{String(condition.value)}</strong>
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Action ALORS
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-emerald-800">Destinataire</span>
                    <select value={form.action.target} onChange={(event) => setForm({ ...form, action: { ...form.action, target: event.target.value as Rule["action"]["target"] } })} className="form-input">
                      <option value="assignedUser">Utilisateur assigné</option>
                      <option value="creator">Créateur</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-emerald-800">Sévérité</span>
                    <select value={form.action.severity} onChange={(event) => setForm({ ...form, action: { ...form.action, severity: event.target.value as Rule["action"]["severity"] } })} className="form-input">
                      <option value="info">Info</option>
                      <option value="warning">Avertissement</option>
                      <option value="danger">Danger</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-emerald-800">Destination</span>
                    <select
                      value={form.redirectTarget || form.action.redirectTarget || form.action.actionUrl || "/tasks"}
                      onChange={(event) => {
                        const redirectTarget = event.target.value;
                        setForm({
                          ...form,
                          redirectTarget,
                          action: { ...form.action, redirectTarget, actionUrl: redirectTarget },
                        });
                      }}
                      className="form-input"
                    >
                      {redirectTargetOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label} → {option.value}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid gap-3">
                  <input value={form.action.title} onChange={(event) => setForm({ ...form, action: { ...form.action, title: event.target.value } })} className="form-input" placeholder="Titre de la notification" />
                  <textarea value={form.action.message} onChange={(event) => setForm({ ...form, action: { ...form.action, message: event.target.value } })} className="form-input min-h-[90px]" placeholder="Message de la notification" />
                </div>
                <p className="mt-3 text-sm font-medium text-emerald-800">
                  ALORS envoyer une notification <strong>{translateSeverity(form.action.severity)}</strong> à <strong>{translateTarget(form.action.target)}</strong>.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={form.isActive !== false} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-violet-600" />
                Règle activée
              </label>

              <button type="submit" disabled={saveRule.isPending} className="w-full rounded-2xl bg-gray-950 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                {saveRule.isPending ? "Enregistrement..." : "Enregistrer la règle"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">Liste des règles</h2>
            <p className="mt-1 text-sm text-gray-500">Les règles sont liées au tenant et persistées dans MongoDB.</p>

            <div className="mt-5 space-y-4">
              {isLoading ? (
                <div className="space-y-4 p-2">
                  <Skeleton className="h-28 rounded-2xl bg-gray-100" />
                  <Skeleton className="h-28 rounded-2xl bg-gray-100" />
                  <Skeleton className="h-28 rounded-2xl bg-gray-100" />
                </div>
              ) : rules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Aucune règle créée pour le moment.</div>
              ) : (
                rules.map((rule) => (
                  <div key={rule._id || rule.id || rule.name} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-gray-950">{rule.name}</h3>
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", rule.isActive === false ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700")}>
                            {rule.isActive === false ? "Désactivée" : "Active"}
                          </span>
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{rule.resource}</span>
                        </div>
                        {rule.description && <p className="mt-2 text-sm text-gray-500">{rule.description}</p>}
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                          <p><span className="font-bold">SI</span> {rule.conditions?.[0]?.metric} {rule.conditions?.[0]?.operator} {String(rule.conditions?.[0]?.value)}</p>
                          <p className="mt-1"><span className="font-bold">ALORS</span> notifier {translateTarget(rule.action?.target)} avec sévérité {translateSeverity(rule.action?.severity)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editRule(rule)} className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50" title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => void handleDelete(rule)} className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-950">Journaux d'exécution</h2>
              <p className="text-sm text-gray-500">Exécutions récentes visibles dans l'interface pour le suivi opérationnel.</p>
            </div>
            <Clock3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {executionLogs.length ? executionLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                <p className="mt-3 text-sm text-gray-700">
                  <strong>{log.rulesEvaluated}</strong> règles évaluées
                </p>
                <p className={cn("mt-1 text-sm font-bold", log.triggeredCount > 0 ? "text-rose-600" : "text-emerald-600")}>
                  {log.triggeredCount} alertes déclenchées
                </p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 md:col-span-2 xl:col-span-4">
                Exécutez le moteur de règles pour voir les journaux ici.
              </div>
            )}
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
}

function labelForMetric(value: RuleMetric) {
  return metricOptions.find((option) => option.value === value)?.label || value;
}

function labelForOperator(value: RuleOperator) {
  return operatorOptions.find((option) => option.value === value)?.label || value;
}

function translateTarget(value?: Rule["action"]["target"]) {
  if (value === "assignedUser") return "l'utilisateur assigné";
  if (value === "creator") return "le créateur";
  return "le destinataire";
}

function translateSeverity(value?: Rule["action"]["severity"]) {
  if (value === "warning") return "avertissement";
  if (value === "danger") return "danger";
  return "info";
}

function RuleStat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        {label.includes("Dernière") ? <AlertTriangle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </div>
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950">{value} {suffix || ""}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}
