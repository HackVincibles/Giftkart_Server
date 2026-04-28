const express = require('express');
const router = express.Router();
const {
    requestCancellation,
    getCancellationStatus,
    sellerAcceptCancellation,
    sellerRejectCancellation,
    getCancellationHistory
} = require('../controllers/orderCancellationController');
const { protect, authenticateSeller } = require('../middleware/auth');

// User routes
router.post('/:orderId/request', protect, requestCancellation);
router.get('/:orderId/status', protect, getCancellationStatus);
router.get('/history', protect, getCancellationHistory);

// Seller routes
router.put('/:orderId/accept', authenticateSeller, sellerAcceptCancellation);
router.put('/:orderId/reject', authenticateSeller, sellerRejectCancellation);

module.exports = router;
