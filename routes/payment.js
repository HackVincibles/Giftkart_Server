const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getOrder, getUserOrders, processRefund, updateOrderStatus } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');

router.post('/create', protect, ...validationRules.createOrder, validate, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/orders', protect, getUserOrders);
router.get('/orders/:id', protect, getOrder);
router.post('/refund', protect, processRefund);
router.put('/orders/:orderId/status', protect, authorize('admin', 'creator'), updateOrderStatus);

module.exports = router;
