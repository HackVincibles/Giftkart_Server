const express = require('express');
const router = express.Router();
const {
    createDeliverySchedule,
    getDeliverySchedule,
    updateDeliverySchedule,
    requestReschedule,
    confirmDeliverySchedule,
    getAvailableTimeSlots,
    recordActualDelivery
} = require('../controllers/deliveryScheduleController');
const { protect, authenticateSeller } = require('../middleware/auth');

// User routes
router.post('/', protect, createDeliverySchedule);
router.get('/order/:orderId', protect, getDeliverySchedule);
router.put('/:scheduleId', protect, updateDeliverySchedule);
router.post('/:scheduleId/reschedule', protect, requestReschedule);
router.get('/time-slots/available', protect, getAvailableTimeSlots);

// Seller/Admin routes
router.put('/:scheduleId/confirm', authenticateSeller, confirmDeliverySchedule);
router.post('/:scheduleId/record-delivery', authenticateSeller, recordActualDelivery);

module.exports = router;
