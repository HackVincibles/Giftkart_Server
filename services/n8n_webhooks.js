/**
 * n8n Webhook Integration for Giftkart
 * This service provides webhook endpoints that n8n workflows can call
 */

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const { logger } = require('./logger');
const { emitOrderUpdate, emitNewOrder, emitNotification } = require('./socket');

// Webhook: Order Placed
router.post('/order-placed', async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const order = await Order.findById(orderId)
            .populate('buyer')
            .populate('products.product');
            
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Emit real-time notification to seller
        if (order.products[0]?.product?.seller) {
            emitNewOrder(order.products[0].product.seller, order);
        }
        
        logger.info('Order placed webhook triggered', { orderId });
        res.json({ success: true, message: 'Order placed webhook processed' });
    } catch (error) {
        logger.error('Order placed webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Order Status Updated
router.post('/order-status-updated', async (req, res) => {
    try {
        const { orderId, status, additionalData } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Update order status
        order.status = status;
        await order.save();
        
        // Emit real-time update to user
        emitOrderStatusChange(orderId, status, additionalData);
        
        logger.info('Order status updated webhook triggered', { orderId, status });
        res.json({ success: true, message: 'Order status updated webhook processed' });
    } catch (error) {
        logger.error('Order status updated webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Send Notification
router.post('/send-notification', async (req, res) => {
    try {
        const { userId, sellerId, type, title, message, data } = req.body;
        
        if (userId) {
            emitNotification(userId, { type, title, message, data });
        }
        
        if (sellerId) {
            const { emitSellerNotification } = require('./socket');
            emitSellerNotification(sellerId, { type, title, message, data });
        }
        
        logger.info('Send notification webhook triggered', { userId, sellerId, type });
        res.json({ success: true, message: 'Notification webhook processed' });
    } catch (error) {
        logger.error('Send notification webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Auto-Gift Reminder
router.post('/auto-gift-reminder', async (req, res) => {
    try {
        const { autoGiftId, recipientName, occasion, date } = req.body;
        
        // Here you would send notification to user about upcoming auto-gift
        logger.info('Auto-gift reminder webhook triggered', { autoGiftId, occasion, date });
        res.json({ success: true, message: 'Auto-gift reminder webhook processed' });
    } catch (error) {
        logger.error('Auto-gift reminder webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Inventory Low Alert
router.post('/inventory-low', async (req, res) => {
    try {
        const { productId, currentStock, threshold } = req.body;
        
        // Notify seller about low inventory
        logger.info('Inventory low webhook triggered', { productId, currentStock, threshold });
        res.json({ success: true, message: 'Inventory low webhook processed' });
    } catch (error) {
        logger.error('Inventory low webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Return Requested
router.post('/return-requested', async (req, res) => {
    try {
        const { returnId, orderId, userId } = req.body;
        
        // Notify seller about return request
        logger.info('Return requested webhook triggered', { returnId, orderId });
        res.json({ success: true, message: 'Return requested webhook processed' });
    } catch (error) {
        logger.error('Return requested webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Grievance Created
router.post('/grievance-created', async (req, res) => {
    try {
        const { grievanceId, userId, category } = req.body;
        
        // Notify admin about new grievance
        logger.info('Grievance created webhook triggered', { grievanceId, category });
        res.json({ success: true, message: 'Grievance created webhook processed' });
    } catch (error) {
        logger.error('Grievance created webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Payment Received
router.post('/payment-received', async (req, res) => {
    try {
        const { orderId, amount, paymentId } = req.body;
        
        const order = await Order.findById(orderId);
        if (order) {
            order.status = 'paid';
            order.razorpay_payment_id = paymentId;
            await order.save();
            
            emitOrderStatusChange(orderId, 'paid', { amount, paymentId });
        }
        
        logger.info('Payment received webhook triggered', { orderId, amount });
        res.json({ success: true, message: 'Payment received webhook processed' });
    } catch (error) {
        logger.error('Payment received webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

// Webhook: Daily Summary
router.post('/daily-summary', async (req, res) => {
    try {
        const { date, stats } = req.body;
        
        // Log daily statistics
        logger.info('Daily summary webhook triggered', { date, stats });
        res.json({ success: true, message: 'Daily summary webhook processed' });
    } catch (error) {
        logger.error('Daily summary webhook error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
});

module.exports = router;
