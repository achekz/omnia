import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, updateTaskStatus, getTaskStats } from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';

const router = express.Router();

router.use(protect, tenantIsolation);

router.get('/stats', getTaskStats);
router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateTaskStatus);

export default router;
