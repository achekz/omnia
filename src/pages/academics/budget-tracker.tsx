import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/useAuth";
import { Calculator, TrendingDown, TrendingUp, DollarSign, Wallet } from "lucide-react";

export default function BudgetTrackerPage() {
  const { user } = useAuth();
  
  if (!user || user.profileType !== 'student') {
    return (
      <ModuleLayout activeItem="budget">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Access Restricted</div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout activeItem="budget">
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Budget Tracker</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your student finances, loans, and daily expenses.</p>
          </div>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Add Transaction
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-950/30 rounded-full opacity-50" />
            <div className="flex items-center gap-3 mb-2 relative">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Balance</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4 relative">$2,450.00</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-950/30 rounded-full opacity-50" />
            <div className="flex items-center gap-3 mb-2 relative">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Monthly Income</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4 relative">$1,200.00</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 dark:bg-rose-950/30 rounded-full opacity-50" />
            <div className="flex items-center gap-3 mb-2 relative">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Monthly Expenses</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4 relative">$850.00</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 dark:bg-amber-950/30 rounded-full opacity-50" />
            <div className="flex items-center gap-3 mb-2 relative">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Remaining Budget</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4 relative">$350.00</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h3>
              <button className="text-sm text-purple-600 font-medium hover:text-purple-700">View All</button>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { name: "Coffee Shop", date: "Today", amount: -4.50, category: "Food" },
                { name: "University Bookstore", date: "Yesterday", amount: -120.00, category: "Education" },
                { name: "Part-time Job", date: "Mar 20", amount: 450.00, category: "Income" },
                { name: "Grocery Store", date: "Mar 18", amount: -65.30, category: "Food" },
                { name: "Netflix Subscription", date: "Mar 15", amount: -15.99, category: "Entertainment" },
              ].map((tx, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${tx.amount > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      {tx.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{tx.category} • {tx.date}</p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Breakdown */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Spending Breakdown</h3>
            
            <div className="flex-1 flex flex-col justify-center space-y-6">
              {[
                { label: "Housing & Utilities", amount: 500, total: 600, color: "bg-blue-500" },
                { label: "Food & Groceries", amount: 200, total: 300, color: "bg-emerald-500" },
                { label: "Education", amount: 120, total: 200, color: "bg-purple-500" },
                { label: "Entertainment", amount: 30, total: 100, color: "bg-rose-500" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500 dark:text-gray-400">${item.amount} / ${item.total}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: `${(item.amount / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
