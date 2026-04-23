import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/use-auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

// Centralized API Client for OmniAI SaaS
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Error handling & 401 redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const toast = useToast(); // Note: This requires toast context
    const [, setLocation] = useLocation();

    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      toast?.toast({
        title: 'Session expired',
        description: 'Please login again.',
        variant: 'destructive',
      });
      setLocation('/login');
    } else if (error.response?.status === 403) {
      toast?.toast({
        title: 'Access denied',
        description: 'Insufficient permissions for this action.',
        variant: 'destructive',
      });
    } else if (error.response?.status >= 500) {
      toast?.toast({
        title: 'Server error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } else if (error.code === 'ERR_NETWORK') {
      toast?.toast({
        title: 'Network error',
        description: 'Unable to connect to server.',
        variant: 'destructive',
      });
    }

    return Promise.reject(error);
  }
);

// API Hooks (React Query alternative)
export const useApi = () => apiClient;

// Custom hooks for common operations
export const useAuthApi = () => ({
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
});

export const useAdminApi = () => ({
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getUsers: () => apiClient.get('/admin/users'),
  toggleUser: (id) => apiClient.put(`/admin/users/${id}/activate`),
});

export const useTaskApi = () => ({
  getTasks: () => apiClient.get('/tasks'),
  createTask: (data) => apiClient.post('/tasks', data),
  updateTask: (id, data) => apiClient.put(`/tasks/${id}`, data),
});

export const useNotificationApi = () => ({
  getNotifications: () => apiClient.get('/notifications'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
});

export default apiClient;
