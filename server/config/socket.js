import { Server } from 'socket.io';

let io;
const userSocketMap = new Map(); // userId → socketId

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket] Client connected: ${socket.id}`);
    }

    socket.on('authenticate', (payload) => {
      const userId = typeof payload === 'string' ? payload : payload?.userId;
      const role = typeof payload === 'object' ? payload?.role : null;
      const tenantId = typeof payload === 'object' ? payload?.tenantId : null;

      if (userId) {
        const normalizedUserId = userId.toString();
        userSocketMap.set(normalizedUserId, socket.id);
        socket.join(`user:${normalizedUserId}`);
        if (role) {
          socket.join(`role:${String(role).toLowerCase()}`);
        }
        if (tenantId) {
          socket.join(`tenant:${tenantId}`);
        }
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Socket] User ${normalizedUserId} authenticated → socket ${socket.id}`);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
};

export const emitToRole = (role, event, data) => {
  if (!io || !role) return;
  io.to(`role:${String(role).toLowerCase()}`).emit(event, data);
};

export const emitToTenant = (tenantId, event, data) => {
  if (!io || !tenantId) return;
  io.to(`tenant:${tenantId}`).emit(event, data);
};

export { io, userSocketMap };
