/**
 * ==========================================
 * REDIS CACHING CONFIGURATION
 * ==========================================
 * Redis client setup and caching utilities
 */

import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize Redis client
 */
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

/**
 * Connect to Redis
 */
export const connectRedis = () => {
  return new Promise((resolve, reject) => {
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      resolve(true);
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      reject(err);
    });
  });
};

/**
 * Cache key generator
 */
export const generateCacheKey = (prefix, ...args) => {
  return `${prefix}:${args.join(':')}`;
};

/**
 * Set cache with TTL
 */
export const setCache = (key, value, ttl = 3600) => {
  return new Promise((resolve, reject) => {
    redisClient.setex(key, ttl, JSON.stringify(value), (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

/**
 * Get cache value
 */
export const getCache = (key) => {
  return new Promise((resolve, reject) => {
    redisClient.get(key, (err, data) => {
      if (err) reject(err);
      else resolve(data ? JSON.parse(data) : null);
    });
  });
};

/**
 * Delete cache key
 */
export const deleteCache = (key) => {
  return new Promise((resolve, reject) => {
    redisClient.del(key, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

/**
 * Delete multiple cache keys by pattern
 */
export const deleteCachePattern = (pattern) => {
  return new Promise((resolve, reject) => {
    redisClient.keys(pattern, (err, keys) => {
      if (err) reject(err);
      else if (keys.length === 0) resolve(0);
      else {
        redisClient.del(...keys, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      }
    });
  });
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  return new Promise((resolve, reject) => {
    redisClient.flushdb((err, reply) => {
      if (err) reject(err);
      else {
        console.log('✅ Cache cleared');
        resolve(reply);
      }
    });
  });
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return new Promise((resolve, reject) => {
    redisClient.info('stats', (err, info) => {
      if (err) reject(err);
      else resolve(info);
    });
  });
};

/**
 * Cache wrapper function (decorator pattern)
 */
export const withCache = (cacheKey, ttl = 3600) => {
  return async (fn) => {
    try {
      // Try to get from cache
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log(`📦 Cache HIT: ${cacheKey}`);
        return cachedData;
      }

      // Cache miss - execute function
      console.log(`📦 Cache MISS: ${cacheKey}`);
      const data = await fn();

      // Store in cache
      await setCache(cacheKey, data, ttl);
      return data;
    } catch (error) {
      console.error('Cache error:', error.message);
      // On error, still try to call function
      return await fn();
    }
  };
};

/**
 * Increment counter in cache
 */
export const incrementCounter = (key, increment = 1, ttl = 3600) => {
  return new Promise((resolve, reject) => {
    redisClient.incr(key, (err, reply) => {
      if (err) reject(err);
      else {
        // Set TTL on first increment
        redisClient.expire(key, ttl);
        resolve(reply);
      }
    });
  });
};

/**
 * Decrement counter in cache
 */
export const decrementCounter = (key, decrement = 1) => {
  return new Promise((resolve, reject) => {
    redisClient.decrby(key, decrement, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

/**
 * Get TTL of key
 */
export const getTTL = (key) => {
  return new Promise((resolve, reject) => {
    redisClient.ttl(key, (err, ttl) => {
      if (err) reject(err);
      else resolve(ttl);
    });
  });
};

/**
 * Set TTL on existing key
 */
export const setExpire = (key, seconds) => {
  return new Promise((resolve, reject) => {
    redisClient.expire(key, seconds, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

/**
 * Check if key exists
 */
export const existsInCache = (key) => {
  return new Promise((resolve, reject) => {
    redisClient.exists(key, (err, reply) => {
      if (err) reject(err);
      else resolve(reply === 1);
    });
  });
};

/**
 * Get all keys matching pattern
 */
export const getKeysByPattern = (pattern) => {
  return new Promise((resolve, reject) => {
    redisClient.keys(pattern, (err, keys) => {
      if (err) reject(err);
      else resolve(keys);
    });
  });
};

/**
 * Set hash field value
 */
export const setHashField = (hashKey, field, value, ttl = 3600) => {
  return new Promise((resolve, reject) => {
    redisClient.hset(hashKey, field, JSON.stringify(value), (err, reply) => {
      if (err) reject(err);
      else {
        redisClient.expire(hashKey, ttl);
        resolve(reply);
      }
    });
  });
};

/**
 * Get hash field value
 */
export const getHashField = (hashKey, field) => {
  return new Promise((resolve, reject) => {
    redisClient.hget(hashKey, field, (err, data) => {
      if (err) reject(err);
      else resolve(data ? JSON.parse(data) : null);
    });
  });
};

/**
 * Get all hash fields
 */
export const getHashAll = (hashKey) => {
  return new Promise((resolve, reject) => {
    redisClient.hgetall(hashKey, (err, data) => {
      if (err) reject(err);
      else {
        const parsed = {};
        Object.keys(data || {}).forEach(k => {
          try {
            parsed[k] = JSON.parse(data[k]);
          } catch {
            parsed[k] = data[k];
          }
        });
        resolve(parsed);
      }
    });
  });
};

/**
 * Push to list
 */
export const pushToList = (key, value, ttl = 3600) => {
  return new Promise((resolve, reject) => {
    redisClient.rpush(key, JSON.stringify(value), (err, reply) => {
      if (err) reject(err);
      else {
        redisClient.expire(key, ttl);
        resolve(reply);
      }
    });
  });
};

/**
 * Get list range
 */
export const getListRange = (key, start = 0, end = -1) => {
  return new Promise((resolve, reject) => {
    redisClient.lrange(key, start, end, (err, data) => {
      if (err) reject(err);
      else {
        const parsed = (data || []).map(item => {
          try {
            return JSON.parse(item);
          } catch {
            return item;
          }
        });
        resolve(parsed);
      }
    });
  });
};

export default {
  redisClient,
  connectRedis,
  generateCacheKey,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  clearAllCache,
  getCacheStats,
  withCache,
  incrementCounter,
  decrementCounter,
  getTTL,
  setExpire,
  existsInCache,
  getKeysByPattern,
  setHashField,
  getHashField,
  getHashAll,
  pushToList,
  getListRange
};
