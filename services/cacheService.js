const redis = require('redis');

// Redis client configuration
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis reconnection failed');
                return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('ready', () => console.log('Redis Client Ready'));

// Connect to Redis
redisClient.connect().catch(console.error);

/**
 * Cache Service
 * Handles caching operations with Redis
 */
class CacheService {
    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 3600)
     */
    async set(key, value, ttl = 3600) {
        try {
            const stringValue = JSON.stringify(value);
            await redisClient.setEx(key, ttl, stringValue);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     */
    async get(key) {
        try {
            const value = await redisClient.get(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    async del(key) {
        try {
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Delete multiple keys matching pattern
     * @param {string} pattern - Key pattern (e.g., "product:*")
     */
    async delPattern(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return true;
        } catch (error) {
            console.error('Cache delete pattern error:', error);
            return false;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Cache key
     */
    async exists(key) {
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }

    /**
     * Set value with expiration only if key doesn't exist
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     */
    async setNX(key, value, ttl = 3600) {
        try {
            const stringValue = JSON.stringify(value);
            const result = await redisClient.set(key, stringValue, {
                NX: true,
                EX: ttl
            });
            return result === 'OK';
        } catch (error) {
            console.error('Cache setNX error:', error);
            return false;
        }
    }

    /**
     * Increment value
     * @param {string} key - Cache key
     * @param {number} value - Value to increment by
     */
    async incr(key, value = 1) {
        try {
            return await redisClient.incrBy(key, value);
        } catch (error) {
            console.error('Cache increment error:', error);
            return 0;
        }
    }

    /**
     * Get or set pattern - get from cache, if not exists, set and return
     * @param {string} key - Cache key
     * @param {Function} fetchFunction - Function to fetch data if not in cache
     * @param {number} ttl - Time to live in seconds
     */
    async getOrSet(key, fetchFunction, ttl = 3600) {
        try {
            // Try to get from cache
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }

            // Fetch data
            const data = await fetchFunction();

            // Set in cache
            await this.set(key, data, ttl);

            return data;
        } catch (error) {
            console.error('Cache getOrSet error:', error);
            // If cache fails, try to fetch data directly
            return await fetchFunction();
        }
    }

    /**
     * Cache middleware factory
     * @param {string} keyGenerator - Function to generate cache key from request
     * @param {number} ttl - Time to live in seconds
     */
    static middleware(keyGenerator, ttl = 3600) {
        return async (req, res, next) => {
            const cacheKey = keyGenerator(req);
            
            try {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    return res.json(JSON.parse(cached));
                }
            } catch (error) {
                console.error('Cache middleware error:', error);
            }

            // Store original json method
            const originalJson = res.json;

            // Override json method to cache response
            res.json = function(data) {
                originalJson.call(this, data);
                
                // Cache successful responses
                if (res.statusCode === 200) {
                    redisClient.setEx(cacheKey, ttl, JSON.stringify(data)).catch(err => {
                        console.error('Cache response error:', err);
                    });
                }
            };

            next();
        };
    }

    /**
     * Invalidate cache middleware
     * @param {string} pattern - Pattern to invalidate
     */
    static invalidate(pattern) {
        return async (req, res, next) => {
            // Process request first
            next();

            // Invalidate cache after successful response
            res.on('finish', async () => {
                if (res.statusCode < 400) {
                    try {
                        const keys = await redisClient.keys(pattern);
                        if (keys.length > 0) {
                            await redisClient.del(keys);
                        }
                    } catch (error) {
                        console.error('Cache invalidate error:', error);
                    }
                }
            });
        };
    }
}

module.exports = new CacheService();
