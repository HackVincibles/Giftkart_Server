const cacheService = require('../services/cacheService');

/**
 * Cache middleware for GET requests
 * Generates cache key based on route and query parameters
 */
const cache = (ttl = 3600) => {
    return cacheService.middleware((req) => {
        const key = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
        return key;
    }, ttl);
};

/**
 * Invalidate cache for specific patterns
 */
const invalidateCache = (pattern) => {
    return cacheService.invalidate(pattern);
};

/**
 * Generate cache key for products
 */
const productCacheKey = (req) => {
    const { category, minPrice, maxPrice, page, limit } = req.query;
    return `products:${category || 'all'}:${minPrice || 0}:${maxPrice || 'inf'}:${page || 1}:${limit || 20}`;
};

/**
 * Generate cache key for user data
 */
const userCacheKey = (userId) => {
    return `user:${userId}`;
};

/**
 * Generate cache key for recommendations
 */
const recommendationCacheKey = (userId, query) => {
    return `recommendation:${userId}:${Buffer.from(query).toString('base64')}`;
};

module.exports = {
    cache,
    invalidateCache,
    productCacheKey,
    userCacheKey,
    recommendationCacheKey
};
