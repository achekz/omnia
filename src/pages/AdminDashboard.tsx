import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/api-client";

interface AdminStats {
  totalUsers?: number;
  tenants?: number;
  aiQueries?: number;
}

interface AdminUser {
  _id: string;
  name: string;
  role: string;
}

interface AdminTenant {
  _id: string;
  name: string;
  type: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({});
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    void loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      const [dashboardRes, usersRes, tenantsRes] = await Promise.all([
        apiClient.get("/admin/dashboard"),
        apiClient.get("/admin/users?limit=5"),
        apiClient.get("/admin/tenants"),
      ]);

      setStats(dashboardRes.data?.data || {});
      setRecentUsers(usersRes.data?.data?.users || []);
      setTenants(tenantsRes.data?.data?.tenants || []);
    } catch {
      toast({
        title: "Dashboard Load Failed",
        description: "Unable to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>{stats.totalUsers || 0}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>{stats.tenants || 0}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Usage</CardTitle>
          </CardHeader>
          <CardContent>{stats.aiQueries || 0}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
          </CardHeader>
          <CardContent>99.9%</CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.map((entry) => (
            <div key={entry._id} className="flex justify-between py-2">
              <span>{entry.name}</span>
              <Badge>{entry.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.map((entry) => (
            <div key={entry._id} className="flex justify-between py-2">
              <span>{entry.name}</span>
              <Badge>{entry.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
