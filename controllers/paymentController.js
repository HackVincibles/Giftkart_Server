const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Create payment order for products
exports.createOrder = async (req, res) => {
    try {
        const { 
            products, // Array of { productId, quantity }
            shippingAddress,
            paymentMethod, // 'razorpay' or 'wallet'
            useWalletBalance = false
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

            const itemTotal = product.pricing.base * item.quantity;
            totalAmount += itemTotal;
            productDetails.push({
                product: product._id,
                quantity: item.quantity,
                price: product.pricing.base,
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
            products: productDetails
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
