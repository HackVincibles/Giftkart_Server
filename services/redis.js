const redis = require('redis');
const { logger } = require('./logger');

// Redis client configuration
const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

let redisClient = null;
let redisConnected = false;

// Only create Redis client if REDIS_ENABLED is true (default: false for testing)
if (process.env.REDIS_ENABLED === 'true') {
    redisClient = redis.createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    logger.error('Redis reconnection failed after 10 retries');
                    return new Error('Redis reconnection failed');
                }
                return Math.min(retries * 100, 3000);
            }
        }
    });

    redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
    });

    redisClient.on('connect', () => {
        logger.info('Redis client connected');
        redisConnected = true;
    });

    redisClient.on('reconnecting', () => {
        logger.warn('Redis client reconnecting');
    });

    // Connect to Redis
    redisClient.connect().catch(err => {
        logger.error('Failed to connect to Redis', { error: err.message });
    });
} else {
    logger.info('Redis is disabled - running without caching');
}

// Cache helper functions
const cache = {
    // Get value from cache
    get: async (key) => {
        if (!redisClient || !redisConnected) return null;
        try {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Cache get error', { key, error: error.message });
            return null;
        }
    },

    // Set value in cache with expiration
    set: async (key, value, ttl = 3600) => {
        if (!redisClient || !redisConnected) return false;
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error('Cache set error', { key, error: error.message });
            return false;
        }
    },

    // Delete value from cache
    del: async (key) => {
        if (!redisClient || !redisConnected) return false;
        try {
            await redisClient.del(key);
            return true;
        } catch (error) {
            logger.error('Cache delete error', { key, error: error.message });
            return false;
        }
    },

    // Delete multiple keys by pattern
    delPattern: async (pattern) => {
        if (!redisClient || !redisConnected) return 0;
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return keys.length;
        } catch (error) {
            logger.error('Cache delete pattern error', { pattern, error: error.message });
            return 0;
        }
    },

    // Check if key exists
    exists: async (key) => {
        if (!redisClient || !redisConnected) return false;
        try {
            return await redisClient.exists(key) === 1;
        } catch (error) {
            logger.error('Cache exists error', { key, error: error.message });
            return false;
        }
    },

    // Set value only if key doesn't exist
    setNX: async (key, value, ttl = 3600) => {
        if (!redisClient || !redisConnected) return false;
        try {
            const result = await redisClient.set(key, JSON.stringify(value), {
            NX: true,
            EX: ttl
        });
            return result === 'OK';
        } catch (error) {
            logger.error('Cache setNX error', { key, error: error.message });
            return false;
        }
    },

    // Increment value
    incr: async (key) => {
        if (!redisClient || !redisConnected) return 0;
        try {
            return await redisClient.incr(key);
        } catch (error) {
            logger.error('Cache incr error', { key, error: error.message });
            return 0;
        }
    },

    // Decrement value
    decr: async (key) => {
        if (!redisClient || !redisConnected) return 0;
        try {
            return await redisClient.decr(key);
        } catch (error) {
            logger.error('Cache decr error', { key, error: error.message });
            return 0;
        }
    },

    // Get TTL of key
    ttl: async (key) => {
        if (!redisClient || !redisConnected) return -1;
        try {
            return await redisClient.ttl(key);
        } catch (error) {
            logger.error('Cache ttl error', { key, error: error.message });
            return -1;
        }
    }
};

// Rate limiting helper
const rateLimit = {
    // Check if request is allowed
    check: async (identifier, limit, window) => {
        if (!redisClient || !redisConnected) {
            // If Redis is not available, allow all requests (fallback behavior)
            return { allowed: true, remaining: limit, reset: window };
        }
        const key = `ratelimit:${identifier}`;
        const current = await cache.incr(key);

        if (current === 1) {
            await redisClient.expire(key, window);
        }

        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
            reset: await cache.ttl(key)
        };
    },

    // Reset rate limit
    reset: async (identifier) => {
        if (!redisClient || !redisConnected) return;
        const key = `ratelimit:${identifier}`;
        await cache.del(key);
    }
};

// Session storage helper
const session = {
    // Get session data
    get: async (sessionId) => {
        return await cache.get(`session:${sessionId}`);
    },

    // Set session data
    set: async (sessionId, data, ttl = 86400) => {
        return await cache.set(`session:${sessionId}`, data, ttl);
    },

    // Delete session
    delete: async (sessionId) => {
        return await cache.del(`session:${sessionId}`);
    },

    // Refresh session TTL
    refresh: async (sessionId, ttl = 86400) => {
        const key = `session:${sessionId}`;
        const data = await cache.get(key);
        if (data) {
            await cache.set(key, data, ttl);
            return true;
        }
        return false;
    }
};

// Product cache helpers
const productCache = {
    // Cache product data
    getProduct: async (productId) => {
        return await cache.get(`product:${productId}`);
    },

    setProduct: async (productId, productData, ttl = 3600) => {
        return await cache.set(`product:${productId}`, productData, ttl);
    },

    invalidateProduct: async (productId) => {
        return await cache.del(`product:${productId}`);
    },

    // Cache product list
    getProductList: async (queryKey) => {
        return await cache.get(`products:list:${queryKey}`);
    },

    setProductList: async (queryKey, products, ttl = 300) => {
        return await cache.set(`products:list:${queryKey}`, products, ttl);
    },

    invalidateProductList: async () => {
        return await cache.delPattern('products:list:*');
    }
};

// User cache helpers
const userCache = {
    getUser: async (userId) => {
        return await cache.get(`user:${userId}`);
    },

    setUser: async (userId, userData, ttl = 1800) => {
        return await cache.set(`user:${userId}`, userData, ttl);
    },

    invalidateUser: async (userId) => {
        return await cache.del(`user:${userId}`);
    }
};

// Order cache helpers
const orderCache = {
    getOrder: async (orderId) => {
        return await cache.get(`order:${orderId}`);
    },

    setOrder: async (orderId, orderData, ttl = 600) => {
        return await cache.set(`order:${orderId}`, orderData, ttl);
    },

    invalidateOrder: async (orderId) => {
        return await cache.del(`order:${orderId}`);
    }
};

// Close Redis connection
const closeRedis = async () => {
    if (redisClient && redisConnected) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
};

module.exports = {
    redisClient,
    cache,
    rateLimit,
    session,
    productCache,
    userCache,
    orderCache,
    closeRedis
};
