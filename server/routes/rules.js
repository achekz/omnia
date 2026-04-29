import express from 'express';
import { createRule, deleteRule, listRules, runRules, updateRule } from '../controllers/ruleController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { tenantIsolation } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect, tenantIsolation);

router.get('/', authorize('admin', 'entreprise', 'comptable'), listRules);
router.post('/', authorize('admin', 'entreprise', 'comptable'), createRule);
router.post('/run', authorize('admin', 'entreprise', 'comptable'), runRules);
router.put('/:id', authorize('admin', 'entreprise', 'comptable'), updateRule);
router.delete('/:id', authorize('admin', 'entreprise', 'comptable'), deleteRule);

export default router;
