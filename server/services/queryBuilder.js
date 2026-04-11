/**
 * ==========================================
 * ADVANCED QUERY BUILDER
 * ==========================================
 * Complex query construction for advanced filtering
 */

/**
 * Build advanced MongoDB aggregation pipeline for complex queries
 */
export const buildAdvancedPipeline = (filters, options = {}) => {
  const pipeline = [];

  const {
    userId,
    tenantId,
    searchTerm,
    dateRange = {},
    amountRange = {},
    sortBy = 'date',
    limit = 15,
    skip = 0
  } = filters;

  // Stage 1: Match basic filters
  const matchStage = {};

  if (userId) matchStage.userId = userId;
  if (tenantId) matchStage.tenantId = tenantId;

  // Stage 2: Text search (if search term provided)
  if (searchTerm) {
    matchStage.$text = { $search: searchTerm };
    pipeline.push({
      $addFields: {
        score: { $meta: 'textScore' }
      }
    });
  }

  // Stage 3: Date range filtering
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) {
      matchStage.createdAt.$gte = new Date(dateRange.start);
    }
    if (dateRange.end) {
      matchStage.createdAt.$lte = new Date(dateRange.end);
    }
  }

  // Stage 4: Amount range filtering
  if (amountRange.min || amountRange.max) {
    matchStage.amount = {};
    if (amountRange.min) {
      matchStage.amount.$gte = parseFloat(amountRange.min);
    }
    if (amountRange.max) {
      matchStage.amount.$lte = parseFloat(amountRange.max);
    }
  }

  // Add match stage if there are any conditions
  if (Object.keys(matchStage).length > 0) {
    pipeline.unshift({ $match: matchStage });
  }

  // Stage 5: Sorting
  const sortStage = buildSortStage(sortBy, searchTerm);
  pipeline.push(sortStage);

  // Stage 6: Pagination
  pipeline.push(
    { $skip: skip },
    { $limit: limit }
  );

  return pipeline;
};

/**
 * Build sort stage for aggregation pipeline
 */
const buildSortStage = (sortBy, hasSearch = false) => {
  const sortOptions = {
    'date': { createdAt: -1 },
    'date_asc': { createdAt: 1 },
    'relevance': hasSearch ? { score: -1 } : { createdAt: -1 },
    'priority': { priority: -1 },
    'amount': { amount: -1 },
    'amount_asc': { amount: 1 },
    'title': { title: 1 },
    'status': { status: 1 },
    'popular': { views: -1 }
  };

  const sortOrder = sortOptions[sortBy] || { createdAt: -1 };
  return { $sort: sortOrder };
};

/**
 * Build analytics aggregation pipeline
 */
export const buildAnalyticsPipeline = (userId, tenantId, groupBy = 'day') => {
  const dateFormat = {
    'day': '%Y-%m-%d',
    'week': '%Y-W%V',
    'month': '%Y-%m',
    'year': '%Y'
  };

  return [
    {
      $match: { userId, tenantId }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat[groupBy] || dateFormat.day,
            date: '$createdAt'
          }
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ];
};

/**
 * Build category aggregation for finance records
 */
export const buildCategoryAnalyticsPipeline = (userId, tenantId) => {
  return [
    {
      $match: { userId, tenantId }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        latestDate: { $max: '$createdAt' }
      }
    },
    {
      $sort: { total: -1 }
    },
    {
      $project: {
        _id: 1,
        category: '$_id',
        total: 1,
        count: 1,
        avgAmount: 1,
        latestDate: 1
      }
    }
  ];
};

/**
 * Build status distribution aggregation (for tasks)
 */
export const buildStatusDistributionPipeline = (userId) => {
  return [
    {
      $match: { userId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgPriority: { $avg: { $switch: {
          branches: [
            { case: { $eq: ['$priority', 'urgent'] }, then: 4 },
            { case: { $eq: ['$priority', 'high'] }, then: 3 },
            { case: { $eq: ['$priority', 'medium'] }, then: 2 },
            { case: { $eq: ['$priority', 'low'] }, then: 1 }
          ],
          default: 0
        }
        }}
      }
    },
    {
      $sort: { count: -1 }
    }
  ];
};

/**
 * Build faceted search pipeline (multiple filters at once)
 */
export const buildFacetedSearchPipeline = (searchTerm, userId) => {
  return [
    {
      $match: {
        $text: { $search: searchTerm },
        userId
      }
    },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        recentItems: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    }
  ];
};

/**
 * Build time-series aggregation
 */
export const buildTimeSeriesPipeline = (userId, tenantId, metric = 'count', days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return [
    {
      $match: {
        userId,
        tenantId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        value: metric === 'amount' 
          ? { $sum: '$amount' }
          : { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];
};

/**
 * Build comparison aggregation (compare periods)
 */
export const buildComparisonPipeline = (userId, tenantId, metric = 'amount', periodDays = 30) => {
  const now = new Date();
  const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousEnd = currentStart;

  return [
    {
      $facet: {
        current: [
          {
            $match: {
              userId,
              tenantId,
              createdAt: { $gte: currentStart, $lte: now }
            }
          },
          {
            $group: {
              _id: null,
              value: metric === 'amount' 
                ? { $sum: '$amount' }
                : { $sum: 1 },
              count: { $sum: 1 }
            }
          }
        ],
        previous: [
          {
            $match: {
              userId,
              tenantId,
              createdAt: { $gte: previousStart, $lte: previousEnd }
            }
          },
          {
            $group: {
              _id: null,
              value: metric === 'amount' 
                ? { $sum: '$amount' }
                : { $sum: 1 },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ];
};

export default {
  buildAdvancedPipeline,
  buildSortStage,
  buildAnalyticsPipeline,
  buildCategoryAnalyticsPipeline,
  buildStatusDistributionPipeline,
  buildFacetedSearchPipeline,
  buildTimeSeriesPipeline,
  buildComparisonPipeline
};
