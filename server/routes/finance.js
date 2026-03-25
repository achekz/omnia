import express from 'express';
import { getRecords, createRecord, getSummary, getAnomalies } from '../controllers/financeController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect, tenantIsolation, authorize('company_admin', 'cabinet_admin', 'manager'));

router.get('/records', getRecords);
router.post('/records', createRecord);
router.get('/summary', getSummary);
router.get('/anomalies', getAnomalies);

export default router;
