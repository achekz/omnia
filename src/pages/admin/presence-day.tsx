import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, Clock, Search, Users, UserX } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetPresenceDay } from "@/lib/api-client";
import type { Attendance, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const roles = ["all", "employee", "stagiaire", "comptable"];
const statuses = ["all", "present", "absent", "late", "very_late"];

function getUser(record: Attendance): Partial<User> {
  if (typeof record.userId === "object" && record.userId) return record.userId as Partial<User>;
  return record.userSnapshot || {};
}

function statusLabel(status: string) {
  return status.replace("_", " ");
}

function statusTone(status: string) {
  if (status === "present" || status === "on_time") return "bg-emerald-100 text-emerald-700";
  if (status === "absent") return "bg-red-100 text-red-700";
  if (status === "late") return "bg-orange-100 text-orange-700";
  return "bg-red-950 text-red-50";
}

export default function AdminPresenceDayPage() {
  const [, params] = useRoute("/admin/presences/:date");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const date = params?.date;
  const { data, isLoading } = useGetPresenceDay(date, { role, status }, { query: { refetchInterval: 30000 } });
  const records = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data.records;
    return data.records.filter((record) => {
      const user = getUser(record);
      return [user.name, user.firstName, user.lastName, user.email, user.role, record.reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data.records, search]);
  const chartData = [
    { label: "Present", value: data.stats.totalPresent, fill: "#059669" },
    { label: "Absent", value: data.stats.totalAbsent, fill: "#dc2626" },
    { label: "Late", value: data.stats.totalLate, fill: "#f97316" },
  ];

  return (
    <ModuleLayout activeItem="presences">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/admin/presences" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-100">
              <ArrowLeft className="h-4 w-4" />
              Calendar
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-gray-950 dark:text-gray-100">{date}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Detailed attendance by user, role, and status.</p>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="Search users or reasons"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Present" value={data.stats.totalPresent} tone="emerald" />
          <Stat icon={<UserX className="h-4 w-4" />} label="Absent" value={data.stats.totalAbsent} tone="rose" />
          <Stat icon={<Clock className="h-4 w-4" />} label="Late" value={data.stats.totalLate} tone="orange" />
          <Stat icon={<Clock className="h-4 w-4" />} label="Avg delay" value={`${data.stats.avgDelay} min`} tone="gray" />
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {roles.map((option) => (
                  <FilterButton key={option} active={role === option} label={option} onClick={() => setRole(option)} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((option) => (
                  <FilterButton key={option} active={status === option} label={statusLabel(option)} onClick={() => setStatus(option)} />
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Check-in</th>
                    <th className="px-5 py-4">Check-out</th>
                    <th className="px-5 py-4">Delay</th>
                    <th className="px-5 py-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={7}>Loading presences...</td></tr>
                  ) : records.length ? (
                    records.map((record) => {
                      const user = getUser(record);
                      const name = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
                      return (
                        <tr key={record._id || record.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-5 py-4 font-semibold">{name}</td>
                          <td className="px-5 py-4 capitalize">{user.role || user.profileType || "-"}</td>
                          <td className="px-5 py-4">
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold capitalize", statusTone(record.status))}>{statusLabel(record.status)}</span>
                          </td>
                          <td className="px-5 py-4">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-GB") : "-"}</td>
                          <td className="px-5 py-4">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString("en-GB") : "-"}</td>
                          <td className="px-5 py-4">{record.delayMinutes || 0} min</td>
                          <td className="px-5 py-4">{record.reason || record.checkOutReason || "-"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={7}>No records match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-base font-bold text-gray-950 dark:text-gray-100">Day split</h2>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2 text-sm font-semibold capitalize transition",
        active
          ? "border-gray-950 bg-gray-950 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
      )}
    >
      {label}
    </button>
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
