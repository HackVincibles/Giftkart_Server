const express = require('express');
const router = express.Router();
const {
    requestReturn,
    getUserReturns,
    getSellerReturns,
    getReturnDetails,
    sellerRespondToReturn,
    schedulePickup,
    processRefund,
    cancelReturn
} = require('../controllers/returnController');
const { protect, authenticateSeller } = require('../middleware/auth');

// User routes
router.post('/request', protect, requestReturn);
router.get('/my-returns', protect, getUserReturns);
router.get('/:returnId', protect, getReturnDetails);
router.put('/:returnId/cancel', protect, cancelReturn);

// Seller routes
router.get('/seller/returns', authenticateSeller, getSellerReturns);
router.put('/:returnId/respond', authenticateSeller, sellerRespondToReturn);
router.put('/:returnId/pickup', authenticateSeller, schedulePickup);
router.put('/:returnId/refund', authenticateSeller, processRefund);

module.exports = router;
