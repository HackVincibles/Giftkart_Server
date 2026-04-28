const express = require('express');
const router = express.Router();
const {
    getOrderTracking,
    updateTrackingStage,
    addCourierDetails,
    updateCurrentLocation,
    recordDeliveryAttempt,
    submitDeliveryProof,
    reportIssue,
    submitFeedback,
    getTrackingTimeline
} = require('../controllers/orderTrackingController');
const { protect, authenticateSeller } = require('../middleware/auth');

// User routes
router.get('/:orderId', protect, getOrderTracking);
router.get('/:orderId/timeline', protect, getTrackingTimeline);
router.post('/:orderId/feedback', protect, submitFeedback);
router.post('/:orderId/issue', protect, reportIssue);

// Seller/Admin routes
router.put('/:orderId/stage', authenticateSeller, updateTrackingStage);
router.put('/:orderId/courier', authenticateSeller, addCourierDetails);
router.put('/:orderId/location', authenticateSeller, updateCurrentLocation);
router.post('/:orderId/delivery-attempt', authenticateSeller, recordDeliveryAttempt);
router.post('/:orderId/delivery-proof', authenticateSeller, submitDeliveryProof);

module.exports = router;
