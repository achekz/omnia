/**
 * ==========================================
 * RATE LIMITING MIDDLEWARE
 * ==========================================
 * Prevent API abuse and enforce rate limits
 */

import { incrementCounter, getTTL } from '../config/redis.js';
import { ApiError } from '../utils/ApiResponse.js';

/**
 * Generic rate limit middleware
 */
export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,  // 15 minutes
    max = undefined,
    maxRequests = max ?? 100,    // per window
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later',
    statusCode = 429
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMITS !== "false" && process.env.NODE_ENV !== "production") {
      return next();
    }

    try {
      const key = `ratelimit:${keyGenerator(req)}`;
      const currentCount = await incrementCounter(key, 1, windowSeconds);

      // Add rate limit headers
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
      res.set('X-RateLimit-Reset', Date.now() + windowSeconds * 1000);

      if (currentCount > maxRequests) {
        return res.status(statusCode).json({
          success: false,
          message,
          retryAfter: windowSeconds
        });
      }

      next();
    } catch (error) {
      // On Redis error, allow request through
      console.error('Rate limit error:', error.message);
      next();
    }
  };
};

/**
 * Endpoint-specific rate limiters
 */
export const createRateLimiter = (type = 'general', options = {}) => {
  const limiters = {
    // General API: 100 requests per 15 minutes
    'general': {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100
    },
    // Authentication: 5 requests per 15 minutes per IP
    'auth': {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyGenerator: (req) => `${req.ip}:${req.body?.email || ''}`
    },
    // Search: 30 requests per minute per user
    'search': {
      windowMs: 60 * 1000,
      maxRequests: 30,
      keyGenerator: (req) => `${req.user?._id || req.ip}:search`
    },
    // Upload: 10 requests per hour per user
    'upload': {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
      keyGenerator: (req) => `${req.user?._id}:upload`
    },
    // ML Predict: 20 requests per day per user
    'ml': {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 20,
      keyGenerator: (req) => `${req.user?._id}:ml`
    },
    // Finance: 50 requests per hour per user
    'finance': {
      windowMs: 60 * 60 * 1000,
      maxRequests: 50,
      keyGenerator: (req) => `${req.user?._id}:finance`
    }
  };

  const config = { ...limiters[type], ...options };
  return rateLimit(config);
};

/**
 * Per-user rate limiter (requires authentication)
 */
export const userRateLimit = (windowMs = 60 * 60 * 1000, maxRequests = 1000) => {
  return rateLimit({
    windowMs,
    maxRequests,
    keyGenerator: (req) => req.user?._id || req.ip,
    message: 'User rate limit exceeded'
  });
};

/**
 * Per-IP rate limiter
 */
export const ipRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return rateLimit({
    windowMs,
    maxRequests,
    keyGenerator: (req) => req.ip,
    message: 'IP rate limit exceeded'
  });
};

/**
 * Sliding window rate limiter
 */
export const slidingWindowRateLimit = (windowMs = 60000, maxRequests = 10) => {
  return async (req, res, next) => {
    try {
      const key = `ratelimit:sliding:${req.user?._id || req.ip}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Add current request timestamp
      await incrementCounter(`${key}:${now}`, 1, Math.ceil(windowMs / 1000));

      // Get all requests in current window
      const windowSeconds = Math.ceil(windowMs / 1000);
      const ttl = await getTTL(key);

      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - 1));

      next();
    } catch (error) {
      console.error('Sliding window rate limit error:', error.message);
      next();
    }
  };
};

/**
 * Token bucket rate limiter
 */
export const tokenBucketRateLimit = (capacity = 10, refillRate = 1) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id || req.ip;
      const bucketKey = `ratelimit:bucket:${userId}`;
      const lastRefillKey = `ratelimit:bucket:refill:${userId}`;

      const now = Date.now();

      // Get current tokens
      let bucketData = await getHashAll(bucketKey);
      let tokens = bucketData?.tokens || capacity;
      let lastRefill = bucketData?.lastRefill || now;

      // Calculate tokens to add based on time elapsed
      const timeSinceRefill = (now - lastRefill) / 1000; // in seconds
      const tokensToAdd = Math.floor(timeSinceRefill * refillRate);

      if (tokensToAdd > 0) {
        tokens = Math.min(capacity, tokens + tokensToAdd);
        lastRefill = now;
      }

      // Check if request allowed
      if (tokens < 1) {
        res.set('X-RateLimit-Reset', new Date(lastRefill + (1 / refillRate) * 1000).toISOString());
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Token bucket empty.',
          retryAfter: Math.ceil(1 / refillRate)
        });
      }

      // Consume token
      tokens -= 1;
      await setHashField(bucketKey, 'tokens', tokens, 3600);
      await setHashField(bucketKey, 'lastRefill', lastRefill, 3600);

      res.set('X-RateLimit-Remaining', Math.floor(tokens));
      next();
    } catch (error) {
      console.error('Token bucket error:', error.message);
      next();
    }
  };
};

/**
 * Burst protection - prevent sudden spikes
 */
export const burstProtection = (maxBurst = 20) => {
  return async (req, res, next) => {
    try {
      const key = `ratelimit:burst:${req.user?._id || req.ip}`;
      const burstCounter = await incrementCounter(key, 1, 1); // 1 second window

      if (burstCounter > maxBurst) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests in short time. Please slow down.',
          retryAfter: 1
        });
      }

      next();
    } catch (error) {
      console.error('Burst protection error:', error.message);
      next();
    }
  };
};

/**
 * Exponential backoff rate limiter
 */
export const exponentialBackoffLimiter = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id || req.ip;
      const attemptKey = `ratelimit:attempts:${userId}`;
      const lockoutKey = `ratelimit:lockout:${userId}`;

      // Check if user is locked out
      const isLockedOut = await existsInCache(lockoutKey);
      if (isLockedOut) {
        const ttl = await getTTL(lockoutKey);
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Account temporarily locked.',
          retryAfter: ttl
        });
      }

      // Track failed attempts (you'd set this on failed auth attempt)
      const attempts = parseInt(await getCache(attemptKey) || 0);

      res.set('X-RateLimit-Attempts', attempts);
      next();
    } catch (error) {
      console.error('Exponential backoff error:', error.message);
      next();
    }
  };
};

/**
 * Record failed attempt and apply backoff
 */
export const recordFailedAttempt = async (userId, maxAttempts = 5) => {
  const attemptKey = `ratelimit:attempts:${userId}`;
  const lockoutKey = `ratelimit:lockout:${userId}`;

  const attempts = await incrementCounter(attemptKey, 1, 3600);

  if (attempts >= maxAttempts) {
    // Lock out user with exponential backoff
    const backoffSeconds = Math.pow(2, Math.min(attempts - maxAttempts, 5)) * 60; // 1-30 min
    await setCache(lockoutKey, true, backoffSeconds);
    console.log(`⚠️  User ${userId} locked out for ${backoffSeconds}s`);
  }

  return attempts;
};

/**
 * Reset failed attempts
 */
export const resetFailedAttempts = async (userId) => {
  const attemptKey = `ratelimit:attempts:${userId}`;
  await deleteCache(attemptKey);
};

/**
 * Get rate limit status
 */
export const getRateLimitStatus = async (userId) => {
  const authLimiter = `ratelimit:auth:${userId}`;
  const uploadLimiter = `ratelimit:upload:${userId}`;
  const mlLimiter = `ratelimit:ml:${userId}`;

  return {
    auth: {
      remaining: 5 - parseInt(await getCache(authLimiter) || 0),
      limit: 5
    },
    upload: {
      remaining: 10 - parseInt(await getCache(uploadLimiter) || 0),
      limit: 10
    },
    ml: {
      remaining: 20 - parseInt(await getCache(mlLimiter) || 0),
      limit: 20
    }
  };
};

export default rateLimit;
