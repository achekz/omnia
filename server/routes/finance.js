import express from 'express';
import { getRecords, createRecord, getSummary, getAnomalies } from '../controllers/financeController.js';
import { protect } from '../middleware/auth.js';
import { tenantIsolation } from '../middleware/tenant.js';
import { authorize } from '../middleware/rbac.js';
import {
  validateCreateFinanceRecord,
  handleValidationErrors
} from '../utils/validators.js';

const router = express.Router();

router.use(protect, tenantIsolation, authorize('company_admin', 'cabinet_admin', 'manager'));

/**
 * @swagger
 * /api/finance/records:
 *   get:
 *     tags: [Finance]
 *     summary: Get financial records
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of financial records
 */
router.get('/records', getRecords);

/**
 * @swagger
 * /api/finance/records:
 *   post:
 *     tags: [Finance]
 *     summary: Create financial record
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Record created
 */
router.post('/records', validateCreateFinanceRecord, handleValidationErrors, createRecord);

/**
 * @swagger
 * /api/finance/summary:
 *   get:
 *     tags: [Finance]
 *     summary: Get financial summary
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary with totals
 */
router.get('/summary', getSummary);

/**
 * @swagger
 * /api/finance/anomalies:
 *   get:
 *     tags: [Finance]
 *     summary: Get anomaly detection results
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Anomalies detected in financial data
 */
router.get('/anomalies', getAnomalies);

export default router;
