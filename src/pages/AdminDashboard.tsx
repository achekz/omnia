import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Users } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { ModuleLayout } from "@/components/layout/module-layout";

// ================= TYPES =================

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AdminTask {
  _id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
}

interface AdminDashboardPayload {
  stats: AdminStats;
  users: AdminUser[];
  tasks: AdminTask[];
}

// ================= COMPONENT =================

export default function AdminDashboard() {
  const { toast } = useToast();

  const [dashboard, setDashboard] = useState<AdminDashboardPayload>({
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalTasks: 0,
      completedTasks: 0,
    },
    users: [],
    tasks: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/dashboard");
      setDashboard(res.data.data);
    } catch {
      toast({
        title: "Error",
        description: "Cannot load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout activeItem="dashboard">
        <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout activeItem="dashboard">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">System overview and operational metrics.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Users" value={dashboard.stats.totalUsers} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Active users" value={dashboard.stats.activeUsers} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Tasks" value={dashboard.stats.totalTasks} icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard label="Completed" value={dashboard.stats.completedTasks} icon={<CheckCircle2 className="h-5 w-5" />} />
        </div>
      </div>
    </ModuleLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: JSX.Element }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</div>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-950 dark:text-gray-100">{value}</p>
    </div>
  );
}
