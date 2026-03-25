import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import cron from 'node-cron';

// Internal Imports
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ruleEngine } from './services/ruleEngine.js';

// Route Imports
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import notifRoutes from './routes/notifications.js';
import mlRoutes from './routes/ml.js';
import financeRoutes from './routes/finance.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/users.js';

// Load Env
dotenv.config();

// Connect DB
connectDB();

const app = express();
const httpServer = createServer(app);

// Init Socket.io
initSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Root
app.get('/', (req, res) => {
  res.send('OmniAI API is running...');
});

// Global Error Handler
app.use(errorHandler);

// Cron Jobs
// Run rule engine every hour on the hour
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Running Rule Engine...');
  ruleEngine.run();
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
