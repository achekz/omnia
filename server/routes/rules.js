import express from 'express';
import { createRule, deleteRule, listRules, runRules, updateRule } from '../controllers/ruleController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { tenantIsolation } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect, tenantIsolation);

router.get('/', authorize('admin'), listRules);
router.post('/', authorize('admin'), createRule);
router.post('/run', authorize('admin'), runRules);
router.put('/:id', authorize('admin'), updateRule);
router.delete('/:id', authorize('admin'), deleteRule);

export default router;
