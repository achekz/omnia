import express from 'express';
import { predict, recommend, anomaly, history, insights, recommendations } from '../controllers/mlController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect, tenantIsolation);

router.post('/predict', predict);
router.post('/recommend', recommend);
router.post('/anomaly', authorize('company_admin', 'cabinet_admin'), anomaly);
router.get('/history', history);
router.get('/insights', insights);
router.get('/recommendations', recommendations);

export default router;
