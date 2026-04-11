import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/use-auth";
import { BarChart3, TrendingUp, Target, Award, Users, Presentation } from "lucide-react";

export default function MyPerformancePage() {
  const { user } = useAuth();
  
  if (!user || user.profileType !== 'employee') {
    return (
      <ModuleLayout activeItem="performances">
        <div className="p-8 text-center text-gray-500">Access Restricted</div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout activeItem="performances">
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-gray-900">My Performance</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your KPIs, goals, and recent achievements.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-purple-500/20">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
                Q1 2026
              </span>
            </div>
            <h3 className="text-purple-100 text-sm font-medium">Overall Score</h3>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-bold">92</span>
              <span className="text-purple-200 mb-1">/ 100</span>
            </div>
            <p className="text-sm mt-4 text-purple-100 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-300" /> +4% from last quarter
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Task Completion</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">On-time delivery rate</p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">98.5%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-emerald-500 w-[98.5%] rounded-full" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Peer Feedback</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average team rating</p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">4.8</span>
              <span className="text-gray-500 dark:text-gray-400 mb-1">/ 5.0</span>
            </div>
            <div className="flex gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className={`w-5 h-5 ${star <= 4 ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Presentation className="w-5 h-5 text-purple-600" />
              Current Objectives (OKRs)
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { title: "Increase system test coverage to 85%", progress: 65, color: "bg-blue-500" },
              { title: "Complete Q1 compliance training", progress: 100, color: "bg-emerald-500" },
              { title: "Mentor 2 junior developers", progress: 40, color: "bg-purple-500" },
              { title: "Deploy AI module to staging", progress: 85, color: "bg-amber-500" },
            ].map((okr, i) => (
              <div key={i} className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{okr.title}</span>
                  <span className="text-sm font-semibold text-gray-700">{okr.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${okr.color} rounded-full transition-all duration-1000`} style={{ width: `${okr.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
