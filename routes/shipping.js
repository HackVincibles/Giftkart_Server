const express = require('express');
const router = express.Router();
const {
    calculateShippingCost,
    generateShippingLabel,
    trackShipment,
    getShippingProviders,
    createShippingProvider,
    updateShippingProvider
} = require('../controllers/shippingController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/providers', getShippingProviders);
router.get('/track/:trackingNumber', trackShipment);

// Protected routes
router.post('/calculate-cost', protect, calculateShippingCost);
router.post('/orders/:orderId/label', protect, generateShippingLabel);

// Admin routes
router.post('/providers', protect, authorize('admin'), createShippingProvider);
router.put('/providers/:providerId', protect, authorize('admin'), updateShippingProvider);

module.exports = router;
