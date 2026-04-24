import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";

const budgetCards = [
  { title: "Monthly budget", value: "$1,200", icon: <PiggyBank className="w-5 h-5 text-indigo-600" /> },
  { title: "Spent so far", value: "$540", icon: <TrendingDown className="w-5 h-5 text-rose-500" /> },
  { title: "Remaining", value: "$660", icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
];

export default function BudgetPage() {
  return (
    <ModuleLayout activeItem="budget">
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">Budget Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Track income, spending, and study-related expenses with a lightweight starter view.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {budgetCards.map((card) => (
            <div key={card.title} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</h2>
                {card.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upcoming expenses</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <span className="text-gray-700 dark:text-gray-200">Tuition installment</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">$300</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <span className="text-gray-700 dark:text-gray-200">Books and materials</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">$120</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <span className="text-gray-700 dark:text-gray-200">Transport</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">$60</span>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
