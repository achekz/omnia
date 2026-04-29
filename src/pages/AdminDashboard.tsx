import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Link } from "wouter";
import { Loader2, LogOut, RefreshCw, ShieldCheck, Users, ClipboardList, Sparkles, TimerReset } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import apiClient from "@/lib/api-client";
import { MlOverviewPanel } from "@/components/ai/ml-overview-panel";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/hooks/useAuth"; // ✅ مرة واحدة فقط

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
  const { user, logout, clearAllUsers } = useAuth(); // ✅ هنا الحل
  const { toast } = useToast();
  const { socket } = useSocket();

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      {/* ✅ زر حذف الحسابات */}
      <button
        onClick={clearAllUsers}
        className="mb-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        🧹 Supprimer les comptes
      </button>

      {/* logout */}
      <button
        onClick={logout}
        className="mb-4 ml-2 px-4 py-2 bg-gray-800 text-white rounded"
      >
        Logout
      </button>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white shadow rounded">
          Users: {dashboard.stats.totalUsers}
        </div>
        <div className="p-4 bg-white shadow rounded">
          Tasks: {dashboard.stats.totalTasks}
        </div>
      </div>
    </div>
  );
}