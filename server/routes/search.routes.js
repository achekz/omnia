/**
 * ==========================================
 * SEARCH & ADVANCED FILTER ROUTES
 * ==========================================
 * Advanced search capabilities across all resources
 */

import express from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  searchTasks,
  searchUsers,
  searchFinanceRecords,
  globalSearch,
  getActivityAnalytics,
  getSuggestions
} from '../services/searchService.js';
import { validateSearch, handleValidationErrors, validatePagination } from '../utils/validators.js';

const router = express.Router();

/**
 * POST /api/search/tasks
 * Search tasks with advanced filters
 * 
 * @swagger
 * /api/search/tasks:
 *   post:
 *     tags: [Search]
 *     summary: Search tasks with advanced filters
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               q:
 *                 type: string
 *                 description: Search query (title/description)
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, done]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               sort:
 *                 type: string
 *                 enum: [date, date_asc, relevance, priority]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               page:
 *                 type: integer
 *               limit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/tasks', protect, validateSearch, handleValidationErrors, 
  asyncHandler(async (req, res) => {
    const { q, status, priority, sort, startDate, endDate, page = 1, limit = 15 } = req.body;
    const pagination = validatePagination(page, limit);
    
    const filters = {
      q,
      status,
      priority,
      sort,
      startDate,
      endDate
    };
    
    const results = await searchTasks(req.user.id, filters, pagination);
    
    res.status(200).json({
      success: true,
      data: results
    });
  })
);

/**
 * POST /api/search/finance
 * Search financial records with amount and date filters
 */
router.post('/finance', protect, validateSearch, handleValidationErrors,
  asyncHandler(async (req, res) => {
    const {
      q,
      category,
      minAmount,
      maxAmount,
      sort,
      startDate,
      endDate,
      page = 1,
      limit = 15
    } = req.body;
    
    const pagination = validatePagination(page, limit);
    
    const filters = {
      q,
      category,
      minAmount,
      maxAmount,
      sort,
      startDate,
      endDate
    };
    
    const results = await searchFinanceRecords(
      req.user.id,
      req.user.tenantId,
      filters,
      pagination
    );
    
    res.status(200).json({
      success: true,
      data: results
    });
  })
);

/**
 * POST /api/search/users
 * Search users (admin/manager only)
 */
router.post('/users', protect, validateSearch, handleValidationErrors,
  asyncHandler(async (req, res) => {
    // Check if user has permission
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    const { q, role, sort, page = 1, limit = 15 } = req.body;
    const pagination = validatePagination(page, limit);
    
    const filters = {
      q,
      role,
      sort
    };
    
    const results = await searchUsers(filters, pagination);
    
    res.status(200).json({
      success: true,
      data: results
    });
  })
);

/**
 * GET /api/search/global
 * Global full-text search across all collections
 */
router.get('/global', protect,
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const pagination = validatePagination(page, limit);
    const results = await globalSearch(req.user.id, req.user.tenantId, q, pagination);
    
    res.status(200).json({
      success: true,
      data: results
    });
  })
);

/**
 * GET /api/search/suggest
 * Get suggestions based on user activity
 */
router.get('/suggest', protect,
  asyncHandler(async (req, res) => {
    const suggestions = await getSuggestions(req.user.id, req.user.tenantId);
    
    res.status(200).json({
      success: true,
      data: suggestions
    });
  })
);

/**
 * GET /api/search/analytics
 * Get activity analytics for user
 */
router.get('/analytics', protect,
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const dateRange = parseInt(days) || 30;
    
    if (dateRange < 1 || dateRange > 365) {
      return res.status(400).json({
        success: false,
        message: 'Date range must be between 1 and 365 days'
      });
    }
    
    const analytics = await getActivityAnalytics(req.user.id, req.user.tenantId, dateRange);
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  })
);

/**
 * GET /api/search/export
 * Export search results as CSV/JSON
 */
router.get('/export', protect,
  asyncHandler(async (req, res) => {
    const { format = 'json', type = 'tasks' } = req.query;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Format must be json or csv'
      });
    }
    
    // Fetch data based on type
    let data = [];
    if (type === 'tasks') {
      const results = await searchTasks(req.user.id, {}, { skip: 0, limit: 1000 });
      data = results.tasks;
    } else if (type === 'finance') {
      const results = await searchFinanceRecords(req.user.id, req.user.tenantId, {}, { skip: 0, limit: 1000 });
      data = results.records;
    }
    
    if (format === 'csv') {
      // Convert to CSV
      let csv = type === 'tasks' 
        ? 'Title,Status,Priority,Due Date\n'
        : 'Category,Amount,Type,Date\n';
      
      if (type === 'tasks') {
        data.forEach(item => {
          csv += `"${item.title}","${item.status}","${item.priority}","${item.dueDate}"\n`;
        });
      } else {
        data.forEach(item => {
          csv += `"${item.category}","${item.amount}","${item.type}","${item.createdAt}"\n`;
        });
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data,
        count: data.length
      });
    }
  })
);

export default router;
