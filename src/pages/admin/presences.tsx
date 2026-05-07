import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck2, ChevronLeft, ChevronRight, Clock, Users, UserX } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useToast } from "@/hooks/use-toast";
import { useGetPresenceCalendar } from "@/lib/api-client";
import type { PresenceCalendarDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const roles = ["all", "employee", "stagiaire", "comptable"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTodayKey() {
  const today = new Date();
  return dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function buildCalendarDays(year: number, month: number, records: PresenceCalendarDay[]) {
  const byDate = new Map(records.map((day) => [day.date, day]));
  const first = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<{ key: string; dayNumber?: number; record?: PresenceCalendarDay }> = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `empty-${index}` });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const key = dateKey(year, month, day);
    cells.push({ key, dayNumber: day, record: byDate.get(key) });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}` });
  }

  return cells;
}

export default function AdminPresencesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [role, setRole] = useState("all");
  const [todayKey, setTodayKey] = useState(getTodayKey);
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;
  const { data, isLoading } = useGetPresenceCalendar({ month, year, role }, { query: { refetchInterval: 30000 } });

  useEffect(() => {
    const syncToday = () => setTodayKey(getTodayKey());
    const nowDate = new Date();
    const nextMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1, 0, 0, 1);
    const timeout = window.setTimeout(syncToday, nextMidnight.getTime() - nowDate.getTime());
    const interval = window.setInterval(syncToday, 60 * 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const visibleDays = useMemo(() => data.days.filter((day) => day.date <= todayKey), [data.days, todayKey]);
  const cells = useMemo(() => buildCalendarDays(year, month, visibleDays), [visibleDays, month, year]);
  const visibleStats = useMemo(() => {
    const delayedDays = visibleDays.filter((day) => day.late + day.veryLate > 0);
    return {
      totalPresent: visibleDays.reduce((sum, day) => sum + day.present + day.late + day.veryLate, 0),
      totalAbsent: visibleDays.reduce((sum, day) => sum + day.absent, 0),
      totalLate: visibleDays.reduce((sum, day) => sum + day.late + day.veryLate, 0),
      avgDelay: data.stats.avgDelay && delayedDays.length ? data.stats.avgDelay : 0,
    };
  }, [data.stats.avgDelay, visibleDays]);
  const chartData = visibleDays.map((day) => ({
    day: day.date.slice(8),
    present: day.present + day.late + day.veryLate,
    absent: day.absent,
    late: day.late + day.veryLate,
  }));

  const moveMonth = (offset: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleDateClick = (date: string) => {
    if (date > todayKey) {
      toast({ title: "No data yet", description: "Attendance data is available only for today and past days." });
      return;
    }

    navigate(`/admin/presences/${date}`);
  };

  return (
    <ModuleLayout activeItem="presences">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-950 dark:text-gray-100">Presences</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Calendar attendance, live totals, and delay signals.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {roles.map((option) => (
              <button
                key={option}
                onClick={() => setRole(option)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold capitalize transition",
                  role === option
                    ? "border-gray-950 bg-gray-950 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
                )}
              >
                {translateRole(option)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Total présents" value={visibleStats.totalPresent} tone="emerald" />
          <Stat icon={<UserX className="h-4 w-4" />} label="Total absent" value={visibleStats.totalAbsent} tone="rose" />
          <Stat icon={<Clock className="h-4 w-4" />} label="Users en retard" value={visibleStats.totalLate} tone="orange" />
          <Stat icon={<Clock className="h-4 w-4" />} label="Avg delay" value={`${visibleStats.avgDelay} min`} tone="gray" />
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <header className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300" onClick={() => moveMonth(-1)} title="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="min-w-[180px] text-center text-lg font-bold capitalize text-gray-950 dark:text-gray-100">{monthLabel(cursor)}</h2>
                <button className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300" onClick={() => moveMonth(1)} title="Next month">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300" onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}>
                Today
              </button>
            </header>

            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-xs font-bold uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-800">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="px-2 py-3">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell) => {
                const isToday = cell.key === todayKey;
                const isFuture = Boolean(cell.dayNumber && cell.key > todayKey);

                return (
                  <button
                    key={cell.key}
                    disabled={!cell.dayNumber}
                    aria-disabled={isFuture}
                    title={cell.dayNumber ? tooltipForDay(cell.record, isFuture) : undefined}
                    onClick={() => cell.dayNumber && handleDateClick(cell.key)}
                    className={cn(
                      "min-h-[118px] border-b border-r border-gray-100 p-2 text-left transition dark:border-gray-800",
                      !cell.dayNumber && "bg-gray-50/70 dark:bg-gray-950",
                      cell.dayNumber && !isToday && !isFuture && "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800",
                      isToday && "bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]",
                      isFuture && "cursor-not-allowed bg-gray-900/10 opacity-30 dark:bg-gray-900",
                    )}
                  >
                    {cell.dayNumber ? <CalendarCell dayNumber={cell.dayNumber} record={cell.record} isToday={isToday} isFuture={isFuture} /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-950 dark:text-gray-100">Monthly trend</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Present, absents et retards par jour.</p>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area dataKey="present" stackId="1" stroke="#059669" fill="#a7f3d0" />
                  <Area dataKey="late" stackId="1" stroke="#f97316" fill="#fed7aa" />
                  <Area dataKey="absent" stackId="1" stroke="#dc2626" fill="#fecaca" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {isLoading ? <p className="mt-3 text-sm text-gray-500">Refreshing calendar...</p> : null}
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
}

function tooltipForDay(record?: PresenceCalendarDay, isFuture = false) {
  if (isFuture) return "No data yet";
  const present = (record?.present || 0) + (record?.late || 0) + (record?.veryLate || 0);
  const absent = record?.absent || 0;
  const late = (record?.late || 0) + (record?.veryLate || 0);
  return `${present} présents, ${absent} absents, ${late} en retard`;
}

function CalendarCell({ dayNumber, record, isToday, isFuture }: { dayNumber: number; record?: PresenceCalendarDay; isToday: boolean; isFuture: boolean }) {
  const present = (record?.present || 0) + (record?.late || 0) + (record?.veryLate || 0);
  const absent = record?.absent || 0;
  const late = (record?.late || 0) + (record?.veryLate || 0);

  return (
    <div className="flex h-full flex-col gap-2">
      <span className={cn("text-sm font-bold text-gray-950 dark:text-gray-100", isToday && "text-white")}>{dayNumber}</span>
      {isFuture ? (
        <div className="mt-auto rounded-md border border-dashed border-gray-400/60 px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">
          No data yet
        </div>
      ) : (
        <div className="mt-auto grid gap-1 text-xs font-semibold">
          <CompactMetric tone="emerald" label="P" value={present} />
          <CompactMetric tone="rose" label="A" value={absent} />
          <CompactMetric tone="orange" label="L" value={late} />
        </div>
      )}
    </div>
  );
}

function CompactMetric({ tone, label, value }: { tone: "emerald" | "rose" | "orange"; label: string; value: number }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  };

  return (
    <span className={cn("flex items-center justify-between rounded-md px-2 py-1", tones[tone])}>
      <span>{label}</span>
      <span>{value}</span>
    </span>
  );
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number | string; tone: "emerald" | "rose" | "orange" | "gray" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-md", tones[tone])}>{icon}</div>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-gray-100">{value}</p>
    </div>
  );
}

function translateRole(role: string) {
  if (role === "all") return "All";
  if (role === "employee") return "Employee";
  if (role === "comptable") return "Comptable";
  return "Stagiaire";
}
