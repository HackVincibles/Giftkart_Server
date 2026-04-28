const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const Razorpay = require('razorpay');

// Request order cancellation
const requestCancellation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ _id: orderId, buyer: req.user._id });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        if (order.status === 'cancelled' || order.status === 'delivered' || order.status === 'refunded') {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        // Check if order is already shipped (cancellation window)
        if (order.status === 'shipped') {
            return res.status(400).json({
                success: false,
                message: 'Order has been shipped. Please use return process instead.'
            });
        }

        // Update order status
        order.status = 'cancelled';
        order.cancellationReason = reason;
        order.cancelledAt = Date.now();
        await order.save();

        // Initiate refund if payment was made
        if (order.status === 'paid' || order.razorpay_payment_id) {
            await initiateRefund(order);
        }

        res.json({
            success: true,
            message: 'Order cancellation requested successfully',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error requesting cancellation',
            error: error.message
        });
    }
};

// Initiate refund
const initiateRefund = async (order) => {
    try {
        if (order.paymentMethod === 'razorpay' && order.razorpay_payment_id) {
            // Razorpay refund
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });

            const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
                amount: order.amount * 100, // Amount in paise
                notes: {
                    orderId: order._id.toString(),
                    reason: 'Order cancellation'
                }
            });

            // Create transaction record
            await Transaction.create({
                user: order.buyer,
                type: 'refund',
                amount: order.amount,
                paymentMethod: 'razorpay',
                razorpayRefundId: refund.id,
                orderId: order._id,
                status: 'completed'
            });
        } else if (order.paymentMethod === 'wallet') {
            // Wallet refund
            const wallet = await Wallet.findOne({ user: order.buyer });
            if (wallet) {
                wallet.balance += order.amount;
                wallet.totalEarned += order.amount;
                await wallet.save();

                // Create transaction record
                await Transaction.create({
                    user: order.buyer,
                    type: 'refund',
                    amount: order.amount,
                    paymentMethod: 'wallet',
                    orderId: order._id,
                    status: 'completed'
                });
            }
        }

        // Update order status
        order.status = 'refunded';
        order.refundedAt = Date.now();
        await order.save();
    } catch (error) {
        console.error('Refund initiation failed:', error);
        // Log error but don't fail the cancellation
    }
};

// Get cancellation status
const getCancellationStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, buyer: req.user._id });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const cancellationInfo = {
            orderId: order._id,
            status: order.status,
            canCancel: ['pending', 'paid'].includes(order.status),
            cancellationReason: order.cancellationReason,
            cancelledAt: order.cancelledAt,
            refundStatus: order.status === 'refunded' ? 'completed' : 'pending',
            refundAmount: order.amount,
            refundMethod: order.paymentMethod
        };

        res.json({
            success: true,
            data: cancellationInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching cancellation status',
            error: error.message
        });
    }
};

// Seller accept cancellation
const sellerAcceptCancellation = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if seller owns the products
        const sellerId = req.seller._id;
        const productCreator = order.products[0]?.product?.creator;
        
        if (productCreator?.toString() !== sellerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to accept this cancellation'
            });
        }

        if (order.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is not in cancelled status'
            });
        }

        // Seller accepts cancellation
        order.sellerCancellationResponse = {
            accepted: true,
            respondedAt: Date.now()
        };

        await order.save();

        res.json({
            success: true,
            message: 'Cancellation accepted',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error accepting cancellation',
            error: error.message
        });
    }
};

// Seller reject cancellation
const sellerRejectCancellation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if seller owns the products
        const sellerId = req.seller._id;
        const productCreator = order.products[0]?.product?.creator;
        
        if (productCreator?.toString() !== sellerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to reject this cancellation'
            });
        }

        if (order.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is not in cancelled status'
            });
        }

        // Seller rejects cancellation - revert order status
        order.status = 'paid';
        order.sellerCancellationResponse = {
            accepted: false,
            reason,
            respondedAt: Date.now()
        };

        await order.save();

        res.json({
            success: true,
            message: 'Cancellation rejected, order restored',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error rejecting cancellation',
            error: error.message
        });
    }
};

// Get cancellation history
const getCancellationHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const orders = await Order.find({
            buyer: req.user._id,
            status: { $in: ['cancelled', 'refunded'] }
        })
        .sort({ cancelledAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

        const total = await Order.countDocuments({
            buyer: req.user._id,
            status: { $in: ['cancelled', 'refunded'] }
        });

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching cancellation history',
            error: error.message
        });
    }
};

module.exports = {
    requestCancellation,
    getCancellationStatus,
    sellerAcceptCancellation,
    sellerRejectCancellation,
    getCancellationHistory
};
