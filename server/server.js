import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB, { startMongoReconnectLoop } from './config/db.js';
import { initSocket } from './config/socket.js';
import { setupSwagger } from './config/swagger.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';
import requireDatabase from './middleware/requireDatabase.js';
import { startRecommendationScheduler } from './services/schedulerService.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';
import dashboardRoutes from './routes/dashboard.js';
import financeRoutes from './routes/finance.js';
import mlRoutes from './routes/ml.js';
import notificationRoutes from './routes/notifications.js';
import ruleRoutes from './routes/rules.js';
import teamRoutes from './routes/team.js';
import taskRoutes from './routes/tasks.js';
import uploadRoutes from './routes/upload.routes.js';
import searchRoutes from './routes/search.routes.js';
import User from './models/User.js'; // ✅ مهم

// Load env
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

function setMongoStatus(status) {
  app.locals.mongoStatus = {
    ...app.locals.mongoStatus,
    ...status,
  };
}

// Middleware - Production Security Stack
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Prevent DDoS & brute force
app.use(rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
app.use('/api/auth/login', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, try again later'
}));
app.use('/api/auth/forgot-password', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests, try again later'
}));
app.use('/api/auth/verify-reset-code', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many reset code attempts, try again later'
}));
app.use('/api/auth/reset-password', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts, try again later'
}));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

setMongoStatus({
  connected: false,
  code: 'MONGO_NOT_INITIALIZED',
  message: 'MongoDB connection not initialized',
});

mongoose.connection.on('connected', () => {
  setMongoStatus({
    connected: true,
    code: 'MONGO_CONNECTED',
    message: 'Connected to MongoDB',
  });
});

mongoose.connection.on('disconnected', () => {
  setMongoStatus({
    connected: false,
    code: 'MONGO_CONNECTION_LOST',
    message: 'MongoDB connection was lost. Restart the backend and verify Atlas Network Access.',
  });
});

mongoose.connection.on('reconnected', () => {
  setMongoStatus({
    connected: true,
    code: 'MONGO_CONNECTED',
    message: 'Connected to MongoDB',
  });
});

mongoose.connection.on('error', (error) => {
  setMongoStatus({
    connected: false,
    code: 'MONGO_CONNECTION_ERROR',
    message: error.message || 'MongoDB connection error',
  });
});

// Health check
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'OK' : 'DEGRADED',
    timestamp: new Date(),
    database: {
      connected: dbConnected,
      name: mongoose.connection.name || null,
      readyState: mongoose.connection.readyState,
      code: app.locals.mongoStatus.code,
      message: app.locals.mongoStatus.message,
    },
  });
});

// Production Routes with RBAC & Multi-Tenant
app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/users', requireDatabase, userRoutes);
app.use('/api/admin', requireDatabase, adminRoutes);  // ADMIN only - authorize('ADMIN')
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', requireDatabase, dashboardRoutes);
app.use('/api/finance', requireDatabase, financeRoutes);
app.use('/api/ml', requireDatabase, mlRoutes);
app.use('/api/notifications', requireDatabase, notificationRoutes);
app.use('/api/tasks', requireDatabase, taskRoutes);
app.use('/api/team', requireDatabase, teamRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', requireDatabase, searchRoutes);
app.use('/api/rules', requireDatabase, ruleRoutes);
setupSwagger(app);

// 🧹 DELETE ALL USERS (ADMIN ONLY)
app.get('/delete-all-users', async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.send(`✅ Deleted ${result.deletedCount} users`);
  } catch (err) {
    res.status(500).send("❌ Error deleting users");
  }
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  const dbResult = await connectDB();
  const allowStartWithoutDb = process.env.ALLOW_START_WITHOUT_DB !== 'false';

  setMongoStatus({
    connected: dbResult.connected,
    code: dbResult.connected ? 'MONGO_CONNECTED' : (dbResult.errorCode || 'MONGO_CONNECTION_FAILED'),
    message: dbResult.connected
      ? `Connected to MongoDB${dbResult.isFallback ? ' via fallback URI' : ''}`
      : (dbResult.userMessage || dbResult.error?.message || 'MongoDB connection failed'),
  });

  if (!dbResult.connected && !allowStartWithoutDb) {
    throw dbResult.error || new Error('MongoDB connection failed');
  }

  startMongoReconnectLoop({
    intervalMs: 15000,
    onReconnect: () => {
      console.log('♻️ MongoDB reconnection successful. Protected routes are fully available again.');
      setMongoStatus({
        connected: true,
        code: 'MONGO_CONNECTED',
        message: 'Connected to MongoDB',
      });
    },
  });

  initSocket(httpServer);
  void startRecommendationScheduler();

  httpServer.listen(PORT, () => {
    console.log(`🚀 OmniAI SaaS Server running on port ${PORT}`);
    console.log(`📍 MongoDB: ${(dbResult.uriUsed || process.env.MONGO_URI || 'not configured').slice(0, 50)}...`);
    if (dbResult.connected) {
      console.log('✅ All systems nominal');
    } else {
      console.warn('⚠️ Server started without MongoDB. Database routes will return 503 until the connection is available.');
    }
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error.message);
  process.exit(1);
});

export default app;
