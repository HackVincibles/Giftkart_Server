const express = require('express');
const router = express.Router();
const {
    createOccasionDelivery,
    getOccasionDeliveryByOrder,
    getOccasionDeliveryByAutoGift,
    updateOccasionDelivery,
    recordActualDelivery,
    submitDeliveryFeedback,
    getUpcomingDeliveries,
    rescheduleDelivery,
    getOccasionRequirements
} = require('../controllers/occasionDeliveryController');
const { protect, authenticateSeller } = require('../middleware/auth');

// Public routes
router.get('/requirements/:occasion', getOccasionRequirements);

// User routes
router.post('/', protect, createOccasionDelivery);
router.get('/order/:orderId', protect, getOccasionDeliveryByOrder);
router.get('/auto-gift/:autoGiftId', protect, getOccasionDeliveryByAutoGift);
router.put('/:deliveryId', protect, updateOccasionDelivery);
router.post('/:deliveryId/record-delivery', protect, recordActualDelivery);
router.post('/:deliveryId/feedback', protect, submitDeliveryFeedback);
router.put('/:deliveryId/reschedule', protect, rescheduleDelivery);

// Seller/Admin routes
router.get('/upcoming', authenticateSeller, getUpcomingDeliveries);

module.exports = router;
