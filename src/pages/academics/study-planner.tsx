import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, Clock, BookOpen, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudyPlannerPage() {
  const { user } = useAuth();
  
  if (!user || user.profileType !== 'student') {
    return (
      <ModuleLayout activeItem="planner">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Access Restricted</div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout activeItem="planner">
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Study Planner</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Organize your classes, assignments, and exams.</p>
          </div>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm">
            Add Event
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Calendar View (Placeholder) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-500 dark:text-gray-400">&lt;</button>
                  <button className="px-3 py-1.5 bg-gray-100 text-gray-900 text-sm font-medium rounded-md">Today</button>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-500 dark:text-gray-400">&gt;</button>
                </div>
              </div>
              
              <div className="flex-1 border-t border-gray-100 dark:border-gray-700 pt-6 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Interactive calendar component will be mounted here.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" /> 
                Upcoming Deadlines
              </h3>
              
              <div className="space-y-4">
                {[
                  { title: "Calculus Midterm", time: "Tomorrow, 10:00 AM", type: "Exam", color: "text-rose-700 bg-rose-50 border-rose-100" },
                  { title: "History Essay Draft", time: "Friday, 11:59 PM", type: "Assignment", color: "text-amber-700 bg-amber-50 border-amber-100" },
                  { title: "Physics Lab Report", time: "Next Mon, 2:00 PM", type: "Homework", color: "text-blue-700 bg-blue-50 border-blue-100" },
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${item.color} transition-all hover:brightness-95 cursor-pointer`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">{item.type}</span>
                    </div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm flex items-center gap-1 mt-2 opacity-80">
                      <Clock className="w-3.5 h-3.5" />
                      {item.time}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                Study Goals
              </h3>
              <div className="space-y-3">
                {[
                  { title: "Review Calc Chapters 1-3", done: false },
                  { title: "Draft History Outline", done: true },
                  { title: "Read Physics pre-lab", done: false },
                ].map((goal, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <button className="mt-0.5 shrink-0">
                      {goal.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </button>
                    <span className={`text-sm ${goal.done ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-700 dark:text-gray-100 font-medium'}`}>
                      {goal.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
