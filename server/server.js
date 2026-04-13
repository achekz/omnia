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
import { setupSwagger } from './config/swagger.js';
import ragService from './services/ragService-mongodb.js';
import fs from 'fs';
import path from 'path';

// Route Imports
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import notifRoutes from './routes/notifications.js';
import mlRoutes from './routes/ml.js';
import financeRoutes from './routes/finance.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/users.js';
import aiRoutes from './routes/ai.routes.js';
import searchRoutes from './routes/search.routes.js';
import uploadRoutes from './routes/upload.routes.js';

// Load Env
dotenv.config();

// 🔥 DEBUG: تأكد env تقرى
console.log('MONGO_URI:', process.env.MONGO_URI);

// Connect DB
connectDB();

const app = express();
const httpServer = createServer(app);

// Init Socket.io
initSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Dev logs
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Setup Swagger Documentation
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('✅ Omni AI API is running...');
});

// Index project documents in MongoDB on startup
async function indexProjectDocuments() {
  try {
    console.log('[RAG] 🔄 Indexing project documents in MongoDB...');

    // Wait for DB connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    const projectRoot = process.cwd();
    const documents = [];
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.env', '.next', 'public'];
    const includeExtensions = ['.md', '.js', '.ts', '.py', '.json'];

    function findFiles(dir) {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!excludeDirs.includes(item)) {
              findFiles(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (includeExtensions.includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (content.length < 1024 * 1024) { // Max 1MB per file
                  documents.push({
                    id: `doc_${fullPath.replace(/[^a-z0-9]/gi, '_')}`,
                    name: path.basename(fullPath),
                    path: fullPath,
                    type: ext.substring(1),
                    content,
                  });
                }
              } catch (error) {
                // Skip unreadable files
              }
            }
          }
        }
      } catch (error) {
        // Ignore errors on restricted dirs
      }
    }

    findFiles(projectRoot);

    if (documents.length === 0) {
      console.log('[RAG] ⚠️ No documents found to index');
      return;
    }

    // Index in MongoDB
    const result = await ragService.indexDocuments(documents);

    if (result.success) {
      console.log(`[RAG] ✅ MongoDB indexed: ${result.documentsIndexed} documents, ${result.chunksCreated} chunks`);
    } else {
      console.log('[RAG] ⚠️ Indexing failed:', result.error);
    }
  } catch (error) {
    console.error('[RAG] Error indexing:', error.message);
  }
}

// Auto-index on startup
indexProjectDocuments();

// Global Error Handler
app.use(errorHandler);

// Cron Job (Rule Engine)
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Running Rule Engine...');
  ruleEngine.run();
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});