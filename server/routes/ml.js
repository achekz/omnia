// Role du fichier: definit les routes API et relie les endpoints aux controles backend.
import express from 'express';
import { predict, recommend, anomaly, predictDelay, presenceAnomaly, history, insights, recommendations, taskRisk, taskRecommendation } from '../controllers/mlController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect, tenantIsolation);

router.post('/predict', predict);
router.post('/predict-risk', predict);
router.post('/predict-productivity', predict);
router.post('/predict-delay', predictDelay);
router.post('/task-risk', taskRisk);
router.post('/task-recommendation', taskRecommendation);
router.post('/recommend', recommend);
router.post('/anomaly', authorize('admin', 'comptable'), anomaly);
router.post('/detect-anomaly', authorize('admin', 'comptable'), anomaly);
router.post('/presence-anomaly', authorize('admin', 'comptable'), presenceAnomaly);
router.get('/history', history);
router.get('/insights', insights);
router.get('/recommendations', recommendations);

export default router;
