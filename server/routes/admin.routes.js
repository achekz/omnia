import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import adminController from '../controllers/adminController.js';

const router = express.Router();

// ADMIN ONLY ROUTES - Full system access
router.get('/dashboard', protect, authorize('ADMIN'), requireTenant, adminController.getAdminDashboard);
router.get('/users', protect, authorize('ADMIN'), requireTenant, adminController.getAllUsers);
router.get('/tenants', protect, authorize('ADMIN'), adminController.getAllTenants);
router.put('/users/:id/activate', protect, authorize('ADMIN'), requireTenant, adminController.toggleUserActive);
router.delete('/tenants/:id', protect, authorize('ADMIN'), adminController.deleteTenant);
router.get('/analytics', protect, authorize('ADMIN'), adminController.getSystemAnalytics);
router.get('/ai-insights', protect, authorize('ADMIN'), adminController.getAIInsights);

export default router;
