import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketInstance = io((import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:5000', {
        withCredentials: true,
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        socketInstance.emit('authenticate', {
          userId: user._id || user.id,
          role: user.profileType || user.role,
          tenantId: user.tenantId,
        });
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      // Global Notification Handler
      socketInstance.on('new_notification', (notif) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['ml-insights'] });
        queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
        toast({
          title: notif.title,
          description: notif.message,
          variant: notif.type === 'danger' ? 'destructive' : 'default',
        });
      });

      // General Dashboard Refresh Handler
      socketInstance.on('task_created', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      });
      socketInstance.on('taskCreated', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      });

      socketInstance.on('task_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      });
      socketInstance.on('taskUpdated', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user, queryClient, toast]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
