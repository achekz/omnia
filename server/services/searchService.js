/**
 * ==========================================
 * ADVANCED SEARCH & FILTER SERVICE
 * ==========================================
 * Handles complex queries, filtering, and sorting
 */

import Task from '../models/Task.js';
import User from '../models/User.js';
import FinancialRecord from '../models/FinancialRecord.js';
import ActivityLog from '../models/ActivityLog.js';

/**
 * Build dynamic MongoDB query from filter params
 */
export const buildQuery = (filters) => {
  const query = {};
  
  // Text search
  if (filters.q) {
    query.$text = { $search: filters.q };
  }
  
  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }
  
  // Priority filter
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  // Date range
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  // Amount range (for finance)
  if (filters.minAmount || filters.maxAmount) {
    query.amount = {};
    if (filters.minAmount) {
      query.amount.$gte = parseFloat(filters.minAmount);
    }
    if (filters.maxAmount) {
      query.amount.$lte = parseFloat(filters.maxAmount);
    }
  }
  
  // Category
  if (filters.category) {
    query.category = filters.category;
  }
  
  // User filter
  if (filters.userId) {
    query.userId = filters.userId;
  }
  
  // Tenant isolation
  if (filters.tenantId) {
    query.tenantId = filters.tenantId;
  }
  
  return query;
};

/**
 * Build sort object from sort params
 */
export const buildSort = (sortBy) => {
  const sortMap = {
    'date': { createdAt: -1 },
    'date_asc': { createdAt: 1 },
    'relevance': { score: { $meta: 'textScore' } },
    'priority': { priority: -1 },
    'status': { status: 1 },
    'amount': { amount: -1 },
    'amount_asc': { amount: 1 },
    'name': { name: 1 },
    'popular': { views: -1 }
  };
  
  return sortMap[sortBy] || { createdAt: -1 };
};

/**
 * Search Tasks with advanced filters
 */
export const searchTasks = async (userId, filters, pagination) => {
  const query = buildQuery({
    ...filters,
    userId
  });
  
  const sort = buildSort(filters.sort || 'date');
  const { skip, limit } = pagination;
  
  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name avatar')
      .lean(),
    
    Task.countDocuments(query)
  ]);
  
  return {
    tasks,
    pagination: {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Search Users (admin only)
 */
export const searchUsers = async (filters, pagination) => {
  const query = buildQuery({
    ...filters,
    role: filters.role
  });
  
  // Remove userId from query for user search
  delete query.userId;
  
  const sort = buildSort(filters.sort || 'name');
  const { skip, limit } = pagination;
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshTokens')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    
    User.countDocuments(query)
  ]);
  
  return {
    users,
    pagination: {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Search Financial Records with advanced filtering
 */
export const searchFinanceRecords = async (userId, tenantId, filters, pagination) => {
  const query = buildQuery({
    ...filters,
    userId,
    tenantId
  });
  
  const sort = buildSort(filters.sort || 'date');
  const { skip, limit } = pagination;
  
  const [records, total] = await Promise.all([
    FinancialRecord.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    
    FinancialRecord.countDocuments(query)
  ]);
  
  // Calculate totals by category
  const categoryTotals = await FinancialRecord.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    records,
    categoryTotals,
    pagination: {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Full-text search across multiple collections
 */
export const globalSearch = async (userId, tenantId, searchQuery, pagination) => {
  const textSearchQuery = { $text: { $search: searchQuery } };
  const { skip, limit } = pagination;
  
  const [tasks, users, records] = await Promise.all([
    Task.find({ ...textSearchQuery, userId })
      .select('title description status priority')
      .skip(skip)
      .limit(limit)
      .sort({ score: { $meta: 'textScore' } })
      .lean(),
    
    User.find({ ...textSearchQuery, tenantId })
      .select('-password -refreshTokens')
      .skip(skip)
      .limit(limit)
      .sort({ score: { $meta: 'textScore' } })
      .lean(),
    
    FinancialRecord.find({ ...textSearchQuery, tenantId })
      .skip(skip)
      .limit(limit)
      .sort({ score: { $meta: 'textScore' } })
      .lean()
  ]);
  
  return {
    results: {
      tasks,
      users,
      records
    },
    total: tasks.length + users.length + records.length,
    pagination: {
      page: Math.floor(skip / limit) + 1,
      limit
    }
  };
};

/**
 * Advanced aggregation - Activity analytics
 */
export const getActivityAnalytics = async (userId, tenantId, dateRange) => {
  const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
  
  const [dailyStats, topHours, summary] = await Promise.all([
    // Daily activity trends
    ActivityLog.aggregate([
      {
        $match: { userId, date: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          activeMinutes: { $sum: '$activeMinutes' },
          tasksCompleted: { $sum: '$tasksCompleted' },
          loginCount: { $sum: '$loginCount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    
    // Most active hours
    ActivityLog.aggregate([
      {
        $match: { userId, date: { $gte: startDate } }
      },
      {
        $group: {
          _id: { $hour: '$date' },
          activeMinutes: { $sum: '$activeMinutes' },
          count: { $sum: 1 }
        }
      },
      { $sort: { activeMinutes: -1 } },
      { $limit: 5 }
    ]),
    
    // Summary statistics
    ActivityLog.aggregate([
      {
        $match: { userId, date: { $gte: startDate } }
      },
      {
        $group: {
          _id: null,
          totalActiveMinutes: { $sum: '$activeMinutes' },
          totalTasks: { $sum: '$tasksCompleted' },
          totalOverdue: { $sum: '$overdueCount' },
          avgDailyActive: { $avg: '$activeMinutes' },
          daysActive: { $sum: 1 }
        }
      }
    ])
  ]);
  
  return {
    dailyStats,
    topHours,
    summary: summary[0] || {}
  };
};

/**
 * Suggest relevant content based on user activity
 */
export const getSuggestions = async (userId, tenantId) => {
  const [recentTasks, upcomingDue] = await Promise.all([
    Task.find({ 
      userId,
      status: { $ne: 'done' }
    })
      .sort({ createdAt: -1 })
      .limit(5),
    
    Task.find({
      userId,
      status: { $ne: 'done' },
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })
      .sort({ dueDate: 1 })
      .limit(5)
  ]);
  
  return {
    recentTasks,
    upcomingDue,
    recommendations: [
      recentTasks.length === 0 && 'Create your first task',
      upcomingDue.length === 0 && 'No tasks due soon - great job!',
      upcomingDue.length > 3 && 'You have many tasks due soon'
    ].filter(Boolean)
  };
};

/**
 * Export search results as CSV/JSON
 */
export const exportSearchResults = async (data, format = 'json') => {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  
  if (format === 'csv') {
    // Simple CSV conversion for tasks
    let csv = 'Title,Status,Priority,Due Date\n';
    data.forEach(task => {
      csv += `"${task.title}","${task.status}","${task.priority}","${task.dueDate}"\n`;
    });
    return csv;
  }
};
