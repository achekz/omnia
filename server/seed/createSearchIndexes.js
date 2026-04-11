/**
 * ==========================================
 * MONGODB TEXT INDEXES SETUP
 * ==========================================
 * Creates text indexes for search functionality
 * Run this once during deployment
 */

import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import FinancialRecord from '../models/FinancialRecord.js';

/**
 * Create all required text indexes for search functionality
 */
export const createSearchIndexes = async () => {
  try {
    console.log('📑 Creating text indexes for search...');

    // Task indexes - search by title and description
    await Task.collection.createIndex({ title: 'text', description: 'text' });
    console.log('✅ Task text index created (title, description)');

    // User indexes - search by name and email
    await User.collection.createIndex({ name: 'text', email: 'text' });
    console.log('✅ User text index created (name, email)');

    // Financial Record indexes - search by description
    await FinancialRecord.collection.createIndex({ description: 'text' });
    console.log('✅ FinancialRecord text index created (description)');

    // Additional compound indexes for better performance
    await Task.collection.createIndex({ userId: 1, status: 1, priority: 1 });
    console.log('✅ Task compound index created (userId, status, priority)');

    await Task.collection.createIndex({ userId: 1, dueDate: 1 });
    console.log('✅ Task date index created (userId, dueDate)');

    await FinancialRecord.collection.createIndex({ 
      tenantId: 1, 
      userId: 1, 
      createdAt: -1 
    });
    console.log('✅ FinancialRecord compound index created');

    console.log('✅ All text indexes created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating text indexes:', error.message);
    return false;
  }
};

/**
 * Get index information for all collections
 */
export const getIndexInfo = async () => {
  try {
    const taskIndexes = await Task.collection.getIndexes();
    const userIndexes = await User.collection.getIndexes();
    const financeIndexes = await FinancialRecord.collection.getIndexes();

    console.log('\n📊 Current Indexes:\n');
    console.log('Task Indexes:', Object.keys(taskIndexes));
    console.log('User Indexes:', Object.keys(userIndexes));
    console.log('Finance Indexes:', Object.keys(financeIndexes));

    return { taskIndexes, userIndexes, financeIndexes };
  } catch (error) {
    console.error('Error fetching indexes:', error.message);
    return null;
  }
};

/**
 * Drop all text indexes (for reset/rebuild)
 */
export const dropSearchIndexes = async () => {
  try {
    console.log('🗑️  Dropping text indexes...');

    // Drop text indexes
    const collections = [Task, User, FinancialRecord];
    for (const Collection of collections) {
      const indexes = await Collection.collection.getIndexes();
      for (const [indexName, indexSpec] of Object.entries(indexes)) {
        if (indexSpec.key && Object.values(indexSpec.key).includes('text')) {
          await Collection.collection.dropIndex(indexName);
          console.log(`✅ Dropped text index: ${Collection.modelName} - ${indexName}`);
        }
      }
    }

    console.log('✅ All text indexes dropped');
    return true;
  } catch (error) {
    console.error('❌ Error dropping indexes:', error.message);
    return false;
  }
};

/**
 * Rebuild search indexes (drop and recreate)
 */
export const rebuildSearchIndexes = async () => {
  try {
    console.log('🔄 Rebuilding search indexes...');
    await dropSearchIndexes();
    await createSearchIndexes();
    console.log('✅ Search indexes rebuilt successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error rebuilding indexes:', error.message);
    return false;
  }
};

export default {
  createSearchIndexes,
  getIndexInfo,
  dropSearchIndexes,
  rebuildSearchIndexes
};
