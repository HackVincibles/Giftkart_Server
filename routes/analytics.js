const express = require('express');
const router = express.Router();
const {
    getSalesAnalytics,
    getProductAnalytics,
    getUserAnalytics,
    getSellerAnalytics,
    getConversionAnalytics,
    getFinancialAnalytics
} = require('../controllers/analyticsController');
const { protect, authorize, authenticateSeller } = require('../middleware/auth');

// Admin routes
router.get('/sales', protect, authorize('admin'), getSalesAnalytics);
router.get('/products', protect, authorize('admin'), getProductAnalytics);
router.get('/users', protect, authorize('admin'), getUserAnalytics);
router.get('/sellers', protect, authorize('admin'), getSellerAnalytics);
router.get('/conversion', protect, authorize('admin'), getConversionAnalytics);
router.get('/financial', protect, authorize('admin'), getFinancialAnalytics);

// Seller routes (seller can see their own analytics)
router.get('/seller/sales', authenticateSeller, getSalesAnalytics);
router.get('/seller/products', authenticateSeller, getProductAnalytics);

module.exports = router;
