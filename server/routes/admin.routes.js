// Role du fichier: definit les routes API et relie les endpoints aux controles backend.
import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import adminController from '../controllers/adminController.js';

const router = express.Router();

// ADMIN ONLY ROUTES - Full system access

router.get(
  '/dashboard',
  protect,
  authorize('ADMIN'),
  adminController.getAdminDashboard
);

router.get(
  '/users',
  protect,
  authorize('ADMIN'),
  adminController.getAllUsers
);

router.get(
  '/users/:id/tasks',
  protect,
  authorize('ADMIN'),
  adminController.getUserTaskDetails
);

router.put(
  '/users/:id',
  protect,
  authorize('ADMIN'),
  adminController.updateUserAccount
);

router.post(
  '/users/:id/password-code',
  protect,
  authorize('ADMIN'),
  adminController.sendAdminUserPasswordCode
);

router.post(
  '/users/:id/email-code',
  protect,
  authorize('ADMIN'),
  adminController.sendAdminUserEmailCode
);

router.delete(
  '/users/:id',
  protect,
  authorize('ADMIN'),
  adminController.deleteUserAccount
);

router.get(
  '/presences',
  protect,
  authorize('ADMIN'),
  adminController.getAllPresences
);

router.get(
  '/tasks',
  protect,
  authorize('ADMIN'),
  adminController.getAllTasks
);

router.get(
  '/tenants',
  protect,
  authorize('ADMIN'),
  adminController.getAllTenants
);

router.put(
  '/users/:id/activate',
  protect,
  authorize('ADMIN'),
  requireTenant,
  adminController.toggleUserActive
);

router.delete(
  '/tenants/:id',
  protect,
  authorize('ADMIN'),
  adminController.deleteTenant
);

router.get(
  '/analytics',
  protect,
  authorize('ADMIN'),
  adminController.getSystemAnalytics
);

router.get(
  '/ai-insights',
  protect,
  authorize('ADMIN'),
  adminController.getAIInsights
);

router.post(
  '/detect-global-anomalies',
  protect,
  authorize('ADMIN'),
  adminController.detectGlobalAnomalies
);

router.post(
  '/monitor-user-risks',
  protect,
  authorize('ADMIN'),
  adminController.monitorUserRisks
);

router.post(
  '/optimize-system-rules',
  protect,
  authorize('ADMIN'),
  adminController.optimizeSystemRules
);

router.get(
  '/recommendations/weekly',
  protect,
  authorize('ADMIN'),
  adminController.getWeeklyRecommendations
);

router.post(
  '/recommendations/weekly/generate',
  protect,
  authorize('ADMIN'),
  adminController.generateWeeklyRecommendation
);

export default router;
