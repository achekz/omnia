import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";

const plannerItems = [
  { title: "Deep work block", time: "09:00 - 11:00", status: "Focus" },
  { title: "Revision sprint", time: "13:00 - 14:30", status: "Planned" },
  { title: "Assignment review", time: "18:00 - 19:00", status: "Pending" },
];

export default function PlannerPage() {
  return (
    <ModuleLayout activeItem="planner">
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">Study Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Plan your sessions, stay consistent, and keep upcoming work visible.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Today&apos;s Schedule</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">A simple placeholder planner ready for real data.</p>
              </div>
            </div>

            <div className="space-y-4">
              {plannerItems.map((item) => (
                <div key={item.title} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/60">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.time}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{item.status}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock3 className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Next milestone</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Finalize weekly revision plan before Friday evening.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Quick actions</h2>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>Block time for exams</li>
                <li>Review overdue assignments</li>
                <li>Sync personal budget with deadlines</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </ModuleLayout>
  );
}
