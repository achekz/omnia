import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import apiClient from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users, Building2, Activity, BarChart3, Zap, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../hooks/use-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, usersRes, tenantsRes] = await Promise.all([
        apiClient.get('/api/admin/dashboard'),
        apiClient.get('/api/admin/users?limit=5'),
        apiClient.get('/api/admin/tenants')
      ]);

      setStats(dashboardRes.data || {});
      setRecentUsers(usersRes.data.users || []);
      setTenants(tenantsRes.data.tenants || []);
    } catch (error) {
      toast?.toast({
        title: 'Dashboard Load Failed',
        description: 'Unable to load admin data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-12"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <Zap className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 to-indigo-900 bg-clip-text text-transparent">
              Admin Control Panel
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
              Complete system overview • {user?.email} (Super Admin)
            </p>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadAdminData}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Refresh All Data
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12"
      >
        <Card className="glass-panel hover:shadow-2xl transition-all border-0 bg-gradient-to-br from-white/80 to-indigo-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-lg font-bold">Total Users</CardTitle>
            <Users className="h-8 w-8 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-gray-900">
              {stats.totalUsers?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              +{(stats.newUsers || 0).toLocaleString()} this week
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:shadow-2xl transition-all border-0 bg-gradient-to-br from-white/80 to-purple-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-lg font-bold">Active Tenants</CardTitle>
            <Building2 className="h-8 w-8 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-gray-900">
              {stats.tenants?.toLocaleString() || '0'}
            </div>
            <Badge variant="secondary" className="mt-2">
              {stats.activeTenants || 0} active
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:shadow-2xl transition-all border-0 bg-gradient-to-br from-white/80 to-emerald-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-lg font-bold">AI Usage</CardTitle>
            <Zap className="h-8 w-8 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-gray-900">
              {stats.aiQueries?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Queries this month
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:shadow-2xl transition-all border-0 bg-gradient-to-br from-white/80 to-orange-50/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-lg font-bold">System Uptime</CardTitle>
            <Activity className="h-8 w-8 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">
              99.9%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full" style={{ width: '99.9%' }}></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 2xl:grid-cols-2 gap-8"
      >
        {/* Recent Users */}
        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Recent Users (Last 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.slice(0, 8).map((u) => (
                <motion.div 
                  key={u._id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {u.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {u.role}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tenants Overview */}
        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Active Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenants.slice(0, 6).map((t) => (
                <motion.div 
                  key={t._id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                      t.type === 'company' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                      t.type === 'cabinet' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                      'bg-gradient-to-r from-purple-500 to-pink-600'
                    }`}>
                      {t.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{t.type} • {t.plan}</p>
                    </div>
                  </div>
                  <Badge className="text-sm">
                    {t.members?.length || 0} users
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Admin Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
              {[
                { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
                { icon: Users, label: 'Users', href: '/admin/users' },
                { icon: Building2, label: 'Tenants', href: '/admin/tenants' },
                { icon: Database, label: 'Documents', href: '/admin/documents' },
                { icon: Zap, label: 'AI Usage', href: '/admin/ai-stats' },
                { icon: Activity, label: 'Logs', href: '/admin/logs' }
              ].map(({ icon: Icon, label, href }, i) => (
                <motion.button
                  key={label}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="group relative p-6 rounded-2xl border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-2xl hover:-translate-y-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md transition-all duration-300 flex flex-col items-center gap-3 h-32"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white text-center leading-tight">{label}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
