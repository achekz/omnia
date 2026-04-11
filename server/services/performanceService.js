/**
 * ==========================================
 * PERFORMANCE OPTIMIZATION UTILITIES
 * ==========================================
 * Database optimization, indexing, and query performance
 */

import mongoose from 'mongoose';

/**
 * Create database indexes for performance
 */
export const createDatabaseIndexes = async () => {
  try {
    console.log('📑 Creating database indexes...');

    // User indexes
    await mongoose.model('User').collection.createIndex({ email: 1 }, { unique: true });
    await mongoose.model('User').collection.createIndex({ tenantId: 1 });
    await mongoose.model('User').collection.createIndex({ role: 1 });
    console.log('✅ User indexes created');

    // Task indexes
    await mongoose.model('Task').collection.createIndex({ userId: 1, status: 1 });
    await mongoose.model('Task').collection.createIndex({ userId: 1, dueDate: -1 });
    await mongoose.model('Task').collection.createIndex({ tenantId: 1 });
    await mongoose.model('Task').collection.createIndex({ assignedTo: 1 });
    console.log('✅ Task indexes created');

    // FinancialRecord indexes
    await mongoose.model('FinancialRecord').collection.createIndex({ userId: 1, createdAt: -1 });
    await mongoose.model('FinancialRecord').collection.createIndex({ tenantId: 1, category: 1 });
    await mongoose.model('FinancialRecord').collection.createIndex({ amount: 1 });
    console.log('✅ FinancialRecord indexes created');

    // ActivityLog indexes
    await mongoose.model('ActivityLog').collection.createIndex({ userId: 1, date: -1 });
    await mongoose.model('ActivityLog').collection.createIndex({ tenantId: 1 });
    console.log('✅ ActivityLog indexes created');

    // MLPrediction indexes
    await mongoose.model('MLPrediction').collection.createIndex({ userId: 1, createdAt: -1 });
    await mongoose.model('MLPrediction').collection.createIndex({ tenantId: 1 });
    console.log('✅ MLPrediction indexes created');

    console.log('✅ All database indexes created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    return false;
  }
};

/**
 * Query optimization - select only needed fields
 */
export const selectFields = {
  user: '-password -refreshTokens',
  userPublic: 'name email avatar role',
  task: 'title description status priority dueDate assignedTo',
  finance: 'amount category type description createdAt',
  activityLog: 'activeMinutes tasksCompleted loginCount date'
};

/**
 * Batch operations for bulk inserts
 */
export const batchInsert = async (Model, data, batchSize = 1000) => {
  try {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      const result = await Model.insertMany(batch);
      results.push(...result);
    }

    console.log(`✅ Inserted ${results.length} documents in batches of ${batchSize}`);
    return results;
  } catch (error) {
    console.error('Error in batch insert:', error.message);
    throw error;
  }
};

/**
 * Bulk update operations
 */
export const bulkUpdate = async (Model, updates) => {
  try {
    const bulk = Model.collection.initializeUnorderedBulkOp();

    for (const update of updates) {
      const { filter, data } = update;
      bulk.find(filter).updateOne({ $set: data });
    }

    const result = await bulk.execute();
    console.log(`✅ Updated ${result.nModified} documents`);
    return result;
  } catch (error) {
    console.error('Error in bulk update:', error.message);
    throw error;
  }
};

/**
 * Pagination with calculated skip
 */
export const getPaginationParams = (page = 1, limit = 15) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
  const skip = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, skip };
};

/**
 * Efficient query with projection
 */
export const efficientQuery = async (Model, filter = {}, options = {}) => {
  const {
    select = '',
    sort = { createdAt: -1 },
    page = 1,
    limit = 15,
    populate = []
  } = options;

  const { skip, limit: finalLimit } = getPaginationParams(page, limit);

  let query = Model.find(filter);

  // Add field selection
  if (select) query = query.select(select);

  // Add sorting
  if (sort) query = query.sort(sort);

  // Add population
  for (const popOption of populate) {
    query = query.populate(popOption);
  }

  // Get total count
  const total = await Model.countDocuments(filter);

  // Execute with pagination
  const data = await query.skip(skip).limit(finalLimit).lean();

  return {
    data,
    pagination: {
      total,
      page,
      limit: finalLimit,
      pages: Math.ceil(total / finalLimit),
      hasNext: page < Math.ceil(total / finalLimit),
      hasPrev: page > 1
    }
  };
};

/**
 * Aggregation pipeline for complex queries
 */
export const aggregateQuery = async (Model, pipeline = []) => {
  try {
    const result = await Model.aggregate(pipeline);
    return result;
  } catch (error) {
    console.error('Aggregation error:', error.message);
    throw error;
  }
};

/**
 * Connection pool optimization
 */
export const configureConnectionPool = () => {
  mongoose.set('maxPoolSize', 10);
  mongoose.set('minPoolSize', 5);

  // Enable connection timeout
  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4
  };

  return options;
};

/**
 * Query performance monitoring
 */
export const enableQueryLogging = () => {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[${'MongoDB'}] ${collectionName}.${method}`);
      console.log('Query:', JSON.stringify(query, null, 2));
    }
  });
};

/**
 * Memory usage optimization - use lean() for read-only queries
 */
export const getLeanDocuments = async (Model, filter = {}, options = {}) => {
  const { page = 1, limit = 15 } = options;
  const { skip } = getPaginationParams(page, limit);

  // .lean() returns plain JavaScript objects instead of Mongoose documents
  // Reduces memory usage by ~50% and improves query speed
  const data = await Model.find(filter)
    .select(options.select || '')
    .sort(options.sort || { createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return data;
};

/**
 * Watch collections for real-time updates (Change Streams)
 */
export const watchCollection = (Model, pipeline = []) => {
  const changeStream = Model.watch(pipeline);

  changeStream.on('change', (change) => {
    console.log('Change detected:', change.operationType);
  });

  changeStream.on('error', (error) => {
    console.error('Change stream error:', error.message);
  });

  return changeStream;
};

/**
 * Database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();

    return {
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      collections: stats.collections,
      objects: stats.objects,
      avgDocumentSize: stats.dataSize / stats.objects
    };
  } catch (error) {
    console.error('Error getting database stats:', error.message);
    return null;
  }
};

/**
 * Collection statistics
 */
export const getCollectionStats = async (Model) => {
  try {
    const stats = await Model.collection.aggregate([
      {
        $collStats: {
          latencyStats: {}
        }
      }
    ]).toArray();

    return stats[0];
  } catch (error) {
    console.error('Error getting collection stats:', error.message);
    return null;
  }
};

/**
 * Index statistics
 */
export const getIndexStats = async (Model) => {
  try {
    const stats = await Model.collection.aggregate([
      { $indexStats: {} }
    ]).toArray();

    return stats;
  } catch (error) {
    console.error('Error getting index stats:', error.message);
    return null;
  }
};

/**
 * Query execution time profiling
 */
export const profileQuery = async (Model, filter = {}, name = 'Query') => {
  const startTime = Date.now();

  try {
    const result = await Model.find(filter).lean();
    const duration = Date.now() - startTime;

    console.log(`⏱️  ${name} took ${duration}ms (${result.length} documents)`);
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${name} failed after ${duration}ms:`, error.message);
    throw error;
  }
};

/**
 * Memory-efficient streaming for large datasets
 */
export const streamLargeDataset = async (Model, callback, batchSize = 1000) => {
  try {
    const total = await Model.countDocuments();
    const batches = Math.ceil(total / batchSize);

    for (let i = 0; i < batches; i++) {
      const skip = i * batchSize;
      const data = await Model.find()
        .skip(skip)
        .limit(batchSize)
        .lean();

      await callback(data, i, batches);
    }

    console.log(`✅ Streamed ${total} documents in ${batches} batches`);
  } catch (error) {
    console.error('Streaming error:', error.message);
    throw error;
  }
};

/**
 * Analyze query plan
 */
export const analyzeQueryPlan = async (Model, filter = {}) => {
  try {
    const plan = await Model.collection.find(filter).explain('executionStats');
    return plan;
  } catch (error) {
    console.error('Error analyzing query plan:', error.message);
    return null;
  }
};

/**
 * Garbage collection optimization
 */
export const optimizeMemory = () => {
  if (global.gc) {
    global.gc();
    console.log('✅ Garbage collection triggered');
  } else {
    console.log('⚠️  Run Node with --expose-gc flag to enable garbage collection');
  }
};

export default {
  createDatabaseIndexes,
  selectFields,
  batchInsert,
  bulkUpdate,
  getPaginationParams,
  efficientQuery,
  aggregateQuery,
  configureConnectionPool,
  enableQueryLogging,
  getLeanDocuments,
  watchCollection,
  getDatabaseStats,
  getCollectionStats,
  getIndexStats,
  profileQuery,
  streamLargeDataset,
  analyzeQueryPlan,
  optimizeMemory
};
