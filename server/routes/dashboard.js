import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect, tenantIsolation);
router.get('/stats', getDashboardStats);

export default router;
