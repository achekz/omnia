import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, LogOut, ShieldCheck, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useConfirmAttendance, useGetMyAttendance, useSendAttendanceCode } from "@/lib/api-client";
import type { Attendance } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AttendanceAction = "check-in" | "check-out";

const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCheckInPreview(now: Date) {
  if (now.getDay() === 0) {
    return { allowed: false, color: "red", status: "Repos du dimanche", requiresReason: false, delay: 0 };
  }

  const minutes = now.getHours() * 60 + now.getMinutes();

  if (minutes < 8 * 60 || minutes >= 18 * 60) {
    return { allowed: false, color: "red", status: "désactivé", requiresReason: false, delay: 0 };
  }

  if (minutes <= 8 * 60 + 30) {
    return { allowed: true, color: "green", status: "à l'heure", requiresReason: false, delay: 0 };
  }

  if (minutes <= 10 * 60 + 30) {
    return { allowed: true, color: "orange", status: "en retard", requiresReason: true, delay: minutes - (8 * 60 + 30) };
  }

  return { allowed: true, color: "red", status: "très en retard", requiresReason: true, delay: minutes - (8 * 60 + 30) };
}

function getCheckOutPreview(now: Date) {
  if (now.getDay() === 0) {
    return { color: "red", status: "Repos du dimanche", requiresReason: false };
  }

  const minutes = now.getHours() * 60 + now.getMinutes();

  if (minutes < 16 * 60) {
    return { color: "red", status: "très tôt", requiresReason: true };
  }

  if (minutes <= 17 * 60) {
    return { color: "orange", status: "tôt", requiresReason: true };
  }

  return { color: "green", status: "à l'heure", requiresReason: false };
}

function normalizeStatus(status?: string) {
  const normalized = String(status || "").replace("_", " ");
  if (normalized === "present") return "présent";
  if (normalized === "absent") return "absent";
  if (normalized === "late") return "en retard";
  if (normalized === "very late") return "très en retard";
  if (normalized === "on time") return "à l'heure";
  if (normalized === "early") return "tôt";
  if (normalized === "very early") return "très tôt";
  return normalized;
}

export default function PresencePage() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<"action" | "code">("action");
  const [action, setAction] = useState<AttendanceAction>("check-in");
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();
  const todayKey = getDateKey(now);
  const isSunday = now.getDay() === 0;

  const { data, isLoading } = useGetMyAttendance(month, year);
  const sendCode = useSendAttendanceCode();
  const confirmAttendance = useConfirmAttendance();

  const todayRecord = data.today;
  const recordsByDate = useMemo(() => {
    return new Map((data.records || []).map((record) => [record.dateKey, record]));
  }, [data.records]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const cells: Array<{ date: Date | null; key: string }> = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) {
      cells.push({ date: null, key: `blank-${i}` });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month - 1, day);
      cells.push({ date, key: getDateKey(date) });
    }

    return cells;
  }, [month, year]);

  const activePreview = action === "check-in" ? getCheckInPreview(new Date()) : getCheckOutPreview(new Date());
  const requiresReason = activePreview.requiresReason;
  const activeDelay = "delay" in activePreview ? Number(activePreview.delay || 0) : 0;

  const openTodayModal = () => {
    setStep("action");
    setCode("");
    setReason("");
    setAction(todayRecord?.checkIn && !todayRecord.checkOut ? "check-out" : "check-in");
    setIsModalOpen(true);
  };

  const requestCode = async (selectedAction: AttendanceAction) => {
    setAction(selectedAction);
    const preview = selectedAction === "check-in" ? getCheckInPreview(new Date()) : getCheckOutPreview(new Date());

    if (new Date().getDay() === 0) {
      toast({ title: "Jour de repos", description: "La présence ne peut pas être marquée le dimanche. Vous pouvez toujours consulter vos tâches.", variant: "destructive" });
      return;
    }

    if ("allowed" in preview && !preview.allowed) {
      toast({ title: "Présence désactivée", description: "L'entrée est autorisée uniquement de 08:00 à 17:59.", variant: "destructive" });
      return;
    }

    if (preview.requiresReason && !reason.trim()) {
      toast({ title: "Raison obligatoire", description: "Veuillez saisir une raison avant la vérification.", variant: "destructive" });
      return;
    }

    try {
      await sendCode.mutateAsync({ action: selectedAction, reason });
      setStep("code");
      toast({ title: "Code envoyé", description: "Vérifiez votre email pour récupérer le code de vérification." });
    } catch (error: any) {
      toast({ title: "Vérification échouée", description: error?.response?.data?.message || "Impossible d'envoyer le code.", variant: "destructive" });
    }
  };

  const confirm = async () => {
    try {
      await confirmAttendance.mutateAsync({ action, code, reason });
      setIsModalOpen(false);
      toast({ title: "Présence enregistrée", description: action === "check-in" ? "Entrée enregistrée." : "Sortie enregistrée." });
    } catch (error: any) {
      toast({ title: "Confirmation échouée", description: error?.response?.data?.message || "Code de vérification invalide.", variant: "destructive" });
    }
  };

  return (
    <ModuleLayout activeItem="presence">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Présence</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Suivi mensuel des présences et des entrées quotidiennes.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Clock className="h-4 w-4" />
            {now.toLocaleTimeString("en-GB")}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(new Date(year, month - 2, 1))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Précédent
              </button>
              <div className="flex items-center gap-2 text-lg font-bold text-gray-950 dark:text-gray-100">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                {currentMonth.toLocaleString("fr-FR", { month: "long", year: "numeric" })}
              </div>
              <button
                onClick={() => setCurrentMonth(new Date(year, month, 1))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Suivant
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-bold uppercase text-gray-400">
                  {day}
                </div>
              ))}

              {calendarDays.map(({ date, key }) => {
                const isToday = key === todayKey;
                const record = recordsByDate.get(key);
                const isClickable = isToday && !isSunday;

                return (
                  <button
                    key={key}
                    disabled={!date || !isClickable}
                    onClick={openTodayModal}
                    className={cn(
                      "min-h-24 rounded-2xl border p-3 text-left transition",
                      !date && "border-transparent bg-transparent",
                      date && "border-gray-200 bg-gray-50 hover:bg-white dark:border-gray-700 dark:bg-gray-800",
                      isToday && "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600",
                      record && !isToday && "border-emerald-200 bg-emerald-50",
                    )}
                  >
                    {date && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm font-bold", isToday ? "text-white" : "text-gray-900 dark:text-gray-100")}>{date.getDate()}</span>
                          {record && <CheckCircle2 className={cn("h-4 w-4", isToday ? "text-white" : "text-emerald-600")} />}
                        </div>
                        {record && (
                          <div className={cn("mt-4 text-xs font-semibold capitalize", isToday ? "text-blue-50" : "text-emerald-700")}>
                            {normalizeStatus(record.status)}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <AttendancePanel record={todayRecord} loading={isLoading} onOpen={openTodayModal} isSunday={isSunday} />
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action === "check-in" ? "Marquer la présence" : "Marquer la sortie"}</DialogTitle>
            <DialogDescription>La vérification par email est obligatoire avant d'enregistrer la présence.</DialogDescription>
          </DialogHeader>

          {step === "action" ? (
            <div className="space-y-4">
              <div className={cn("rounded-2xl border p-4 text-sm", activePreview.color === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700", activePreview.color === "orange" && "border-orange-200 bg-orange-50 text-orange-700", activePreview.color === "red" && "border-rose-200 bg-rose-50 text-rose-700")}>
                <p className="font-bold capitalize">{activePreview.status}</p>
                {activeDelay > 0 && <p className="mt-1">Retard : {activeDelay} minutes</p>}
              </div>

              {requiresReason && (
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Raison"
                  className="min-h-24 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900"
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {!todayRecord?.checkIn && (
                  <button
                    onClick={() => requestCode("check-in")}
                    disabled={sendCode.isPending || !("allowed" in getCheckInPreview(new Date())) || !getCheckInPreview(new Date()).allowed}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Marquer la présence
                  </button>
                )}
                {todayRecord?.checkIn && !todayRecord.checkOut && (
                  <button
                    onClick={() => requestCode("check-out")}
                    disabled={sendCode.isPending}
                    className="rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                  >
                    Sortie
                  </button>
                )}
                {todayRecord?.checkIn && todayRecord.checkOut && (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 sm:col-span-2">Présence complétée pour aujourd'hui.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Code à 6 chiffres"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={confirm}
                disabled={code.length !== 6 || confirmAttendance.isPending}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

function AttendancePanel({ record, loading, onOpen, isSunday }: { record?: Attendance | null; loading: boolean; onOpen: () => void; isSunday: boolean }) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-gray-950 dark:text-gray-100">Aujourd'hui</h2>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Chargement de la présence...</div>
      ) : record ? (
        <div className="space-y-3">
          <InfoRow label="Heure d'entrée" value={record.checkInTime || (record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-GB") : "-")} />
          <InfoRow label="Statut" value={normalizeStatus(record.status)} />
          <InfoRow label="Durée du retard" value={`${record.delayMinutes || 0} min`} />
          <InfoRow label="Raison" value={record.reason || "-"} />
          <InfoRow label="Heure de sortie" value={record.checkOutTime || (record.checkOut ? new Date(record.checkOut).toLocaleTimeString("en-GB") : "-")} />
          <InfoRow label="Statut de sortie" value={record.checkOutStatus ? normalizeStatus(record.checkOutStatus) : "-"} />
          <InfoRow label="Raison de sortie" value={record.checkOutReason || "-"} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Aucune présence marquée aujourd'hui.</div>
      )}

      {isSunday && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Le dimanche est un jour de repos. Vous pouvez ouvrir votre compte et préparer les tâches de demain, mais la présence est désactivée.
        </div>
      )}

      <button disabled={isSunday} onClick={onOpen} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {record?.checkIn && !record.checkOut ? <LogOut className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        {record?.checkIn && !record.checkOut ? "Sortie" : "Marquer la présence"}
      </button>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
      <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
