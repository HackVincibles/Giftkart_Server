const express = require('express');
const router = express.Router();
const {
    searchProducts,
    getSearchSuggestions,
    getTrendingSearches,
    searchByEmotion,
    searchByRelationship,
    getSimilarProducts
} = require('../controllers/searchController');
const { searchLimiter } = require('../middleware/rateLimiter');

// Advanced product search
router.get('/products', searchLimiter, searchProducts);

// Search suggestions (autocomplete)
router.get('/suggestions', getSearchSuggestions);

// Trending searches
router.get('/trending', getTrendingSearches);

// Search by emotion
router.get('/emotion/:emotion', searchByEmotion);

// Search by relationship
router.get('/relationship/:relationship', searchByRelationship);

// Get similar products
router.get('/similar/:productId', getSimilarProducts);

module.exports = router;
