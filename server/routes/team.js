import express from 'express';
import { getTeamMembers } from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect, tenantIsolation);
router.get('/members', getTeamMembers);

export default router;
