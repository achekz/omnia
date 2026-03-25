import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, Notification, FinancialRecord } from './types';

// Axios Instance Config
export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('omniAI_token'); // accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response Interceptor: Handle 401 & Refresh Token
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    // Don't retry auth routes
    if (original.url?.includes('/auth/')) return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('omniAI_refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, { refreshToken });
        
        localStorage.setItem('omniAI_token', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        localStorage.removeItem('omniAI_token');
        localStorage.removeItem('omniAI_refreshToken');
        localStorage.removeItem('omniAI_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

// ─── HOOKS ───

// Dashboard Stats
export const useGetDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/score');
      const { data: taskData } = await api.get('/tasks/stats');
      
      // Attempt to grab extra stats for company/cabinet dashboards if available
      let teamSize = 24;
      let activeProjects = 8;
      let anomaliesDetected = 0;
      let weeklyActivity = null;

      try {
        const [{ data: teamData }, { data: finData }, { data: actData }] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: { users: [] } }})),
          api.get('/finance/summary').catch(() => ({ data: { data: { anomalyCount: 0 } }})),
          api.get('/analytics/activity').catch(() => ({ data: { data: { activity: [] } }}))
        ]);
        
        const users = teamData?.data?.users;
        if (users && users.length) teamSize = users.length;
        if (finData?.data?.anomalyCount) anomaliesDetected = finData.data.anomalyCount;
        
        if (actData?.data?.activity && actData.data.activity.length) {
           weeklyActivity = actData.data.activity.slice(-7).map((a: any) => ({
             day: new Date(a.date).toLocaleDateString('en-US', { weekday: 'short' }),
             value: a.score
           }));
        } else {
           // Mock fallback if no activity exists
           weeklyActivity = [
             { day: 'Mon', value: 65 }, { day: 'Tue', value: 72 }, 
             { day: 'Wed', value: 85 }, { day: 'Thu', value: 78 }, 
             { day: 'Fri', value: 90 }, { day: 'Sat', value: 40 }, { day: 'Sun', value: 50 }
           ];
        }
      } catch (e) {
        console.error("Non-critical error fetching extra dashboard stats", e);
      }

      return {
        currentScore: data.data.current,
        trendPct: data.data.trendPct,
        completedTasks: taskData.data.stats.done,
        overdueTasks: taskData.data.stats.overdue,
        totalTasks: taskData.data.stats.total,
        streak: 14,
        teamSize,
        activeProjects,
        anomaliesDetected,
        weeklyActivity
      };
    }
  });
};

// Team / Company Analytics
export const useGetTeamMembers = () => {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/team');
      return data.data.team;
    }
  });
};

// Finance Records
export const useGetFinanceSummary = () => {
  return useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const { data } = await api.get('/finance/summary');
      return data.data;
    }
  });
};

export const useGetFinanceRecords = (page = 1) => {
  return useQuery({
    queryKey: ['finance-records', page],
    queryFn: async () => {
      const { data } = await api.get(`/finance/records?page=${page}`);
      return data.data.records as FinancialRecord[];
    }
  });
};

export const useGetAnomalies = () => {
  return useQuery({
    queryKey: ['finance-anomalies'],
    queryFn: async () => {
      const { data } = await api.get('/finance/anomalies');
      return data.data.anomalies as FinancialRecord[];
    }
  });
};

// Tasks
export const useGetTasks = (filters = {}) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const { data } = await api.get(`/tasks?${params.toString()}`);
      return data.data.tasks.map((t: any) => ({ ...t, id: t._id })) as Task[];
    }
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<Task> }) => {
      if (data.status) {
        return await api.patch(`/tasks/${id}/status`, { status: data.status });
      }
      return await api.put(`/tasks/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Task>) => {
      return await api.post(`/tasks`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  });
};

// Notifications
export const useGetNotifications = (options: { query?: { enabled?: boolean; refetchInterval?: number } } = {}) => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data.notifications.map((n: any) => ({ ...n, id: n._id })) as Notification[];
    },
    enabled: options.query?.enabled ?? true,
    refetchInterval: options.query?.refetchInterval
  });
};

// ML Insights
export const useMlRecommend = (options: { query?: { enabled?: boolean } } = {}) => {
  return useQuery({
    queryKey: ['ml-recommend'],
    queryFn: async () => {
      const { data } = await api.post('/ml/recommend');
      return data.data.recommendations;
    },
    enabled: options.query?.enabled ?? true
  });
};

export const useMlInsights = () => {
  return useQuery({
    queryKey: ['ml-insights'],
    queryFn: async () => {
      const { data } = await api.get('/ml/insights');
      return data.data;
    }
  });
};
