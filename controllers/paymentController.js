const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const OrderTracking = require('../models/OrderTracking');
const notificationService = require('../services/notificationService');

const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Cancel order and refund to wallet
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check authorization
        if (order.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Only allow cancellation if not already shipped or cancelled
        if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be cancelled in current status: ${order.status}` 
            });
        }

        const refundAmount = order.amount;
        order.status = 'cancelled';
        order.deliveryStatus = 'cancelled';
        await order.save();

        // Update tracking
        const tracking = await OrderTracking.findOne({ order: orderId });
        if (tracking) {
            tracking.currentStage = 'cancelled';
            await tracking.save();
        }

        // Sync back to schedule if it was a scheduled gift
        if (order.isScheduledGift && order.scheduleId) {
            const AutoGiftCalendar = require('../models/AutoGiftCalendar');
            await AutoGiftCalendar.findByIdAndUpdate(order.scheduleId, {
                orderId: null,
                orderStatus: 'pending',
                paymentStatus: 'refunded'
            });
        }

        // Refund to wallet
        const wallet = await Wallet.findOneAndUpdate(
            { user: order.buyer },
            { $inc: { balance: refundAmount } },
            { upsert: true, new: true }
        );

        // Create transaction record
        await Transaction.create({
            wallet: wallet._id,
            user: order.buyer,
            type: 'refund',
            amount: refundAmount,
            status: 'completed',
            description: `Refund for cancelled order #${orderId.toString().slice(-6).toUpperCase()}`,
            orderId: order._id
        });

        // Create notification
        await Notification.create({
            user: order.buyer,
            type: 'order_cancelled',
            title: 'Order Cancelled & Refunded',
            message: `Order #${orderId.toString().slice(-6).toUpperCase()} was cancelled. ₹${refundAmount} has been credited to your wallet.`,
            relatedOrder: order._id,
            priority: 'medium'
        });

        res.json({
            success: true,
            message: 'Order cancelled and refund credited to wallet',
            balance: wallet.balance
        });
    } catch (error) {
        console.error('Cancel Order Error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};

module.exports = exports;

// Helper function to handle post-payment order completion tasks
const completeOrderTasks = async (order) => {
    try {
        const OrderTracking = require('../models/OrderTracking');
        const CreatorDashboard = require('../models/CreatorDashboard');
        const Product = require('../models/Product');

        // 1. Create order tracking entry
        await OrderTracking.create({
            order: order._id,
            currentStage: 'confirmed',
            deliveryAddress: {
                name: order.shippingAddress?.name || 'Customer',
                address: `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}`,
                city: order.shippingAddress?.city || '',
                state: order.shippingAddress?.state || '',
                pincode: order.shippingAddress?.pincode || ''
            }
        });

        // 2. Add to Creator Dashboards for all sellers involved
        const sellers = new Set();
        for (const item of order.products) {
            const product = await Product.findById(item.product);
            if (product && product.creator) {
                sellers.add(product.creator.toString());
                
                await CreatorDashboard.findOneAndUpdate(
                    { creator: product.creator },
                    { 
                        $push: { 
                            orderQueue: {
                                order: order._id,
                                status: 'new',
                                priority: 'normal',
                                assignedAt: new Date(),
                                userInputs: {
                                    description: `Order for ${product.name} (Qty: ${item.quantity})`
                                }
                            }
                        },
                        $inc: { 'performance.totalOrders': 1 },
                        $set: { lastUpdated: new Date() }
                    },
                    { upsert: true }
                );
            }
        }

        // 3. Update AutoGiftCalendar if it's a scheduled gift
        if (order.isScheduledGift && order.scheduleId) {
            const AutoGiftCalendar = require('../models/AutoGiftCalendar');
            await AutoGiftCalendar.findByIdAndUpdate(order.scheduleId, {
                orderId: order._id,
                orderStatus: 'ordered',
                paymentStatus: 'paid'
            });
        }

        // 4. Create success notification
        const Notification = require('../models/Notification');
        await Notification.create({
            user: order.buyer,
            type: 'order_status',
            title: 'Order Confirmed! 🎁',
            message: `Your order #${order._id.toString().slice(-6).toUpperCase()} has been successfully placed.`,
            metadata: { orderId: order._id }
        });
        
        return true;
    } catch (err) {
        console.error('Error in completeOrderTasks:', err);
        return false;
    }
};

// Create payment order for products
exports.createOrder = async (req, res) => {
    try {
        const { 
            products, // Array of { productId, quantity }
            shippingAddress,
            paymentMethod, // 'razorpay' or 'wallet'
            useWalletBalance = false,
            isScheduledGift = false,
            scheduleId = null
        } = req.body;

        // Calculate total amount
        let totalAmount = 0;
        const productDetails = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product ${item.productId} not found`
                });
            }

            const itemTotal = product.basePrice * item.quantity;
            totalAmount += itemTotal;
            productDetails.push({
                product: product._id,
                quantity: item.quantity,
                price: product.basePrice,
                name: product.name
            });
        }

        // Check wallet balance if using wallet
        let walletAmount = 0;
        if (useWalletBalance || paymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ user: req.user._id });
            if (!wallet || wallet.balance < totalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }
            walletAmount = Math.min(wallet.balance, totalAmount);
        }

        const razorpayAmount = totalAmount - walletAmount;

        let razorpayOrder = null;
        if (razorpayAmount > 0) {
            const razorpay = getRazorpayInstance();
            const options = {
                amount: razorpayAmount * 100, // Amount in paise
                currency: 'INR',
                receipt: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                notes: {
                    userId: req.user._id.toString(),
                    productCount: products.length
                }
            };

            razorpayOrder = await razorpay.orders.create(options);
        }

        // Create order in database
        const newOrder = await Order.create({
            buyer: req.user._id,
            amount: totalAmount,
            currency: 'INR',
            razorpay_order_id: razorpayOrder?.id || null,
            shippingAddress,
            status: razorpayOrder ? 'pending' : 'paid',
            paymentMethod: razorpayOrder ? 'razorpay' : 'wallet',
            products: productDetails,
            isScheduledGift,
            scheduleId
        });

        // If using wallet, create transaction
        if (walletAmount > 0) {
            const wallet = await Wallet.findOne({ user: req.user._id });
            wallet.balance -= walletAmount;
            await wallet.save();

            await Transaction.create({
                wallet: wallet._id,
                user: req.user._id,
                type: 'purchase',
                amount: walletAmount,
                status: 'completed',
                description: `Order ${newOrder._id}`,
                orderId: newOrder._id
            });
        }

        // IF WALLET ONLY: Complete tasks immediately
        if (razorpayAmount === 0) {
            await completeOrderTasks(newOrder);
        }

        res.status(201).json({
            success: true,
            data: {
                order: newOrder,
                razorpayOrder,
                totalAmount,
                walletAmount,
                razorpayAmount
            }
        });
    } catch (error) {
        console.error('Payment Order Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create payment order',
            error: error.message 
        });
    }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = 'paid';
        order.razorpay_payment_id = razorpay_payment_id;
        order.deliveryStatus = 'awaiting_creator';
        await order.save();

        // Update inventory/stock count for each product
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { 'inventory.stockCount': -item.quantity }
            });
        }

        // Create notification
        await Notification.create({
            user: order.buyer,
            type: 'order_confirmed',
            title: 'Order Confirmed! 🎁',
            message: `Your order #${order._id.toString().slice(-6).toUpperCase()} has been successfully placed.`,
            relatedOrder: order._id,
            priority: 'high'
        });

        // Create transaction record
        await Transaction.create({
            user: order.buyer,
            type: 'purchase',
            amount: order.amount,
            status: 'completed',
            description: `Order payment - ${order._id}`,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            orderId: order._id
        });

        // Send Professional Notifications
        await notificationService.notifyPaymentSuccess(order.buyer, order.amount, order._id);
        await notificationService.notifyOrderPlaced(order.buyer, order._id, order.amount);

        // Complete post-payment tasks (tracking, notifications, schedule sync)
        await completeOrderTasks(order);

        res.status(200).json({ 
            success: true, 
            message: 'Payment verified successfully',
            order 
        });
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

// Get order by ID
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('buyer', 'displayName email')
            .populate('products.product', 'name images basePrice');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check authorization
        if (order.buyer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching order' });
    }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ buyer: req.user._id })
            .populate('products.product', 'name images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments({ buyer: req.user._id });

        res.json({
            success: true,
            count: orders.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
};

// Process refund
exports.processRefund = async (req, res) => {
    try {
        const { orderId, amount, reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Order must be paid to process refund' });
        }

        const razorpay = getRazorpayInstance();
        
        // Initiate refund
        const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
            amount: amount * 100,
            notes: {
                reason: reason || 'Customer requested refund',
                orderId: orderId
            }
        });

        // Update order status
        order.status = 'refunded';
        await order.save();

        // Refund to wallet if payment was via wallet
        if (order.paymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ user: order.buyer });
            if (wallet) {
                wallet.balance += amount;
                await wallet.save();

                await Transaction.create({
                    wallet: wallet._id,
                    user: order.buyer,
                    type: 'refund',
                    amount,
                    status: 'completed',
                    description: `Refund for order ${orderId}`,
                    orderId
                });
            }
        }

        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: refund
        });
    } catch (error) {
        console.error('Refund Error:', error);
        res.status(500).json({ success: false, message: 'Refund processing failed' });
    }
};

// Update order status (for creators/admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { deliveryStatus, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (deliveryStatus) order.deliveryStatus = deliveryStatus;
        if (status) order.status = status;

        await order.save();

        res.json({
            success: true,
            message: 'Order status updated',
            data: order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
};
