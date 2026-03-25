import express from 'express';
import { getProfile, updateProfile, listUsers } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Admin only: list all users in tenant
router.get('/', tenantIsolation, authorize('company_admin', 'cabinet_admin'), listUsers);

export default router;
