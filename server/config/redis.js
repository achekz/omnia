/**
 * Redis Client with In-Memory Fallback
 * Production-ready caching layer + rate limiter support
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class CacheManager {
  client = null;
  fallback = new Map();
  isRedisReady = false;

  constructor() {
    this.init();
  }

  async init() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || `redis://localhost:6379`,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.warn('Redis: Max retries exceeded - using fallback only');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        // console.warn('Redis Error:', err.message);
        this.isRedisReady = false;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis ready');
        this.isRedisReady = true;
      });

      await this.client.connect();
      console.log('✅ Redis connected');

    } catch (error) {
      console.log('ℹ️ Using in-memory cache');
      this.isRedisReady = false;
    }
  }

  // ========================
  // BASIC CACHE METHODS
  // ========================

  async set(key, value, ttl = 3600) {
    try {
      if (this.isRedisReady && this.client) {
        const data = typeof value === 'string' ? value : JSON.stringify(value);
        await this.client.setEx(key, ttl, data);
        return true;
      }
    } catch (error) {
      console.warn('Redis set failed:', error.message);
    }

    // Fallback
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    this.fallback.set(key, { data, expiry: Date.now() + ttl * 1000 });
    return true;
  }

  async get(key) {
    try {
      if (this.isRedisReady && this.client) {
        const data = await this.client.get(key);
        if (data) return JSON.parse(data);
        return null;
      }
    } catch (error) {
      console.warn('Redis get failed:', error.message);
    }

    // Fallback
    const item = this.fallback.get(key);
    if (item && Date.now() < item.expiry) {
      return JSON.parse(item.data);
    }
    return null;
  }

  async del(key) {
    try {
      if (this.isRedisReady && this.client) {
        await this.client.del(key);
      }
    } catch (error) {
      console.warn('Redis del failed:', error.message);
    }

    this.fallback.delete(key);
  }

  async clear() {
    try {
      if (this.isRedisReady && this.client) {
        await this.client.flushDb();
      }
    } catch (error) {
      console.warn('Redis clear failed:', error.message);
    }

    this.fallback.clear();
  }

  // ========================
  // 🔥 RATE LIMITER METHODS
  // ========================

  async increment(key) {
    try {
      if (this.isRedisReady && this.client) {
        return await this.client.incr(key);
      }
    } catch (error) {
      console.warn('Redis incr failed:', error.message);
    }

    // fallback
    const current = this.fallback.get(key) || { count: 0, expiry: Date.now() + 60000 };
    current.count += 1;
    this.fallback.set(key, current);
    return current.count;
  }

  async expire(key, ttl = 60) {
    try {
      if (this.isRedisReady && this.client) {
        await this.client.expire(key, ttl);
        return;
      }
    } catch (error) {
      console.warn('Redis expire failed:', error.message);
    }

    // fallback
    const item = this.fallback.get(key);
    if (item) {
      item.expiry = Date.now() + ttl * 1000;
    }
  }

  async ttl(key) {
    try {
      if (this.isRedisReady && this.client) {
        return await this.client.ttl(key);
      }
    } catch (error) {
      console.warn('Redis ttl failed:', error.message);
    }

    // fallback
    const item = this.fallback.get(key);
    if (!item) return -1;

    const remaining = Math.floor((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }
}

const cache = new CacheManager();

// ========================
// ✅ EXPORTS FOR RATE LIMITER
// ========================

export const incrementCounter = async (key) => {
  const count = await cache.increment(key);

  if (count === 1) {
    await cache.expire(key, 60); // 1 minute window
  }

  return count;
};

export const getTTL = async (key) => {
  return await cache.ttl(key);
};

export default cache;