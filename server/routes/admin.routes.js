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

export default router;
