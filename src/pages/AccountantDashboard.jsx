import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, FileText, Users } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/use-toast';
import apiClient from '../lib/api-client';

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    revenue: 0,
    invoices: 0,
    expenses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/admin/accountant-stats');
      setStats(response.data.data || stats);
    } catch (error) {
      toast.toast({
        title: 'Stats load failed',
        description: 'Unable to load accountant dashboard data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-panel p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/20 to-transparent backdrop-blur-xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${color} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-ping group-hover:bg-emerald-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
          {title}
        </p>
        <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-100 bg-clip-text text-transparent">
          {value.toLocaleString()}
        </p>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-8">
        <div className="glass-panel p-12 rounded-3xl text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Loading Accountant Dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-emerald-600 bg-clip-text text-transparent">
                Accounting Dashboard
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                Financial overview for {user?.profileType} ({user?.tenantId?.slice(-8) || 'Demo'})
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={fetchStats}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Clients" value={stats.totalClients} icon={Users} color="from-blue-500 to-indigo-600" />
          <StatCard title="Revenue" value={stats.revenue} icon={DollarSign} color="from-emerald-500 to-green-600" />
          <StatCard title="Invoices" value={stats.invoices} icon={FileText} color="from-purple-500 to-violet-600" />
          <StatCard title="Expenses" value={stats.expenses} icon={DollarSign} color="from-orange-500 to-red-500" />
        </div>

        {/* Recent Activity & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-8 rounded-3xl">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Recent Transactions</h3>
            <div className="space-y-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Invoice #{1000+i}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Client Name</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 text-lg">$1,250</p>
                    <p className="text-xs text-gray-500">Paid</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Revenue Trend</h3>
            <div className="h-64 bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6">
              {/* Chart placeholder */}
              <div className="h-full flex items-center justify-center text-gray-500">
                Revenue chart will appear here (Chart.js integration ready)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

