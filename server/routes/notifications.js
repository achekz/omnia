import express from 'express';
import { getNotifications, markRead, markAllRead, deleteNotification, clearAll } from '../controllers/notifController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.delete('/clear-all', clearAll);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
