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

    socket.on('authenticate', (userId) => {
      if (userId) {
        userSocketMap.set(userId.toString(), socket.id);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Socket] User ${userId} authenticated → socket ${socket.id}`);
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
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

export { io, userSocketMap };
