import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, updateTaskStatus, getTaskStats } from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import {
  validateCreateTask,
  validateSearch,
  handleValidationErrors
} from '../utils/validators.js';

const router = express.Router();

router.use(protect, tenantIsolation);

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics
 */
router.get('/stats', getTaskStats);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get user tasks with filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, done]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', getTasks);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create new task
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post('/', validateCreateTask, handleValidationErrors, createTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Task updated
 */
router.put('/:id', validateCreateTask, handleValidationErrors, updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete('/:id', deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, done]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', updateTaskStatus);

export default router;
