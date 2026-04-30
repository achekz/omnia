import { CalendarCheck2 } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetAdminPresences } from "@/lib/api-client";
import type { Attendance, User } from "@/lib/types";
import { cn } from "@/lib/utils";

function getUser(record: Attendance): Partial<User> {
  if (typeof record.userId === "object" && record.userId) {
    return record.userId as Partial<User>;
  }

  return record.userSnapshot || {};
}

function label(value?: string) {
  return String(value || "-").replace("_", " ");
}

export default function AdminPresencesPage() {
  const { data: records = [], isLoading } = useGetAdminPresences({ query: { refetchInterval: 30000 } });

  return (
    <ModuleLayout activeItem="presences">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Presences</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">All attendance records sorted by earliest arrival.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Check-in</th>
                <th className="px-5 py-4">Check-out</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Delay</th>
                <th className="px-5 py-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={8}>Loading presences...</td>
                </tr>
              ) : records.length ? (
                records.map((record) => {
                  const user = getUser(record);
                  const status = label(record.status);

                  return (
                    <tr key={record._id || record.id} className="text-gray-700 dark:text-gray-200">
                      <td className="px-5 py-4 font-semibold">{user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-"}</td>
                      <td className="px-5 py-4 capitalize">{user.role || user.profileType || "-"}</td>
                      <td className="px-5 py-4">{user.email || "-"}</td>
                      <td className="px-5 py-4">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-GB") : "-"}</td>
                      <td className="px-5 py-4">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString("en-GB") : "-"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-bold capitalize",
                            record.status === "on_time" && "bg-emerald-100 text-emerald-700",
                            record.status === "late" && "bg-orange-100 text-orange-700",
                            record.status === "very_late" && "bg-rose-100 text-rose-700",
                          )}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4">{record.delayMinutes || 0} min</td>
                      <td className="px-5 py-4">{record.reason || record.checkOutReason || "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={8}>No presence records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
