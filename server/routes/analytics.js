import express from 'express';
import { getActivity, getScore, getTeamAnalytics, logActivity } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect, tenantIsolation);

router.get('/activity', getActivity);
router.get('/score', getScore);
router.get('/team', authorize('admin'), getTeamAnalytics);
router.post('/log', logActivity);

export default router;
