const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Seller = require('../models/Seller');

// Request return
const requestReturn = async (req, res) => {
    try {
        const { orderId, reason, description, items, refundType, pickupAddress } = req.body;

        // Check if order exists and belongs to user
        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is eligible for return (within return window)
        const returnWindow = 7; // 7 days
        const orderDate = new Date(order.createdAt);
        const currentDate = new Date();
        const daysSinceOrder = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));

        if (daysSinceOrder > returnWindow) {
            return res.status(400).json({
                success: false,
                message: 'Return window has expired (7 days from order date)'
            });
        }

        // Check if return already exists for this order
        const existingReturn = await Return.findOne({ order: orderId });
        if (existingReturn) {
            return res.status(400).json({
                success: false,
                message: 'Return request already exists for this order'
            });
        }

        // Get seller from order
        const sellerId = order.products[0]?.creator;
        if (!sellerId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine seller'
            });
        }

        // Calculate refund amount
        let refundAmount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (product) {
                refundAmount += (product.pricing.base * item.quantity);
            }
        }

        // Create return request
        const returnRequest = await Return.create({
            order: orderId,
            user: req.user._id,
            seller: sellerId,
            reason,
            description,
            items,
            refundType,
            refundAmount,
            pickupAddress,
            status: 'requested',
            timeline: [{
                status: 'requested',
                message: 'Return request submitted',
                timestamp: Date.now()
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Return request submitted successfully',
            data: returnRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting return request',
            error: error.message
        });
    }
};

// Get user's returns
const getUserReturns = async (req, res) => {
    try {
        const returns = await Return.find({ user: req.user._id })
            .populate('order')
            .populate('items.product')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: returns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching returns',
            error: error.message
        });
    }
};

// Get seller's returns
const getSellerReturns = async (req, res) => {
    try {
        const returns = await Return.find({ seller: req.seller._id })
            .populate('order')
            .populate('items.product')
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: returns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching returns',
            error: error.message
        });
    }
};

// Get return details
const getReturnDetails = async (req, res) => {
    try {
        const { returnId } = req.params;

        const returnRequest = await Return.findById(returnId)
            .populate('order')
            .populate('items.product')
            .populate('user', 'name email phone')
            .populate('seller', 'businessName email');

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return not found'
            });
        }

        // Check authorization
        if (returnRequest.user._id.toString() !== req.user._id.toString() && 
            returnRequest.seller._id.toString() !== req.seller?._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this return'
            });
        }

        res.json({
            success: true,
            data: returnRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching return details',
            error: error.message
        });
    }
};

// Seller approve/reject return
const sellerRespondToReturn = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { approved, response, rejectedReason } = req.body;

        const returnRequest = await Return.findById(returnId);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return not found'
            });
        }

        // Check if seller owns this return
        if (returnRequest.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to respond to this return'
            });
        }

        // Check if return is in requested status
        if (returnRequest.status !== 'requested') {
            return res.status(400).json({
                success: false,
                message: 'Return has already been processed'
            });
        }

        // Update seller response
        returnRequest.sellerResponse = {
            approved,
            response,
            respondedAt: Date.now(),
            rejectedReason: approved ? null : rejectedReason
        };

        // Update status
        returnRequest.status = approved ? 'approved' : 'rejected';

        await returnRequest.save();

        res.json({
            success: true,
            message: approved ? 'Return approved' : 'Return rejected',
            data: returnRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error responding to return',
            error: error.message
        });
    }
};

// Schedule pickup
const schedulePickup = async (req, res) => {
    try {
        const { returnId } = req.params;
        const { pickupDate, pickupTimeSlot } = req.body;

        const returnRequest = await Return.findById(returnId);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return not found'
            });
        }

        // Check if return is approved
        if (returnRequest.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Return must be approved before scheduling pickup'
            });
        }

        // Update pickup details
        returnRequest.pickupScheduled = true;
        returnRequest.pickupDate = pickupDate;
        returnRequest.pickupTimeSlot = pickupTimeSlot;
        returnRequest.status = 'picked_up';

        await returnRequest.save();

        res.json({
            success: true,
            message: 'Pickup scheduled successfully',
            data: returnRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error scheduling pickup',
            error: error.message
        });
    }
};

// Process refund
const processRefund = async (req, res) => {
    try {
        const { returnId } = req.params;

        const returnRequest = await Return.findById(returnId);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return not found'
            });
        }

        // Check if return is received
        if (returnRequest.status !== 'received') {
            return res.status(400).json({
                success: false,
                message: 'Return must be received before processing refund'
            });
        }

        // Process refund (integrate with Razorpay)
        // For now, just update status
        returnRequest.refundStatus = 'processing';
        returnRequest.status = 'processing';
        await returnRequest.save();

        // Simulate refund processing
        setTimeout(async () => {
            returnRequest.refundStatus = 'completed';
            returnRequest.status = 'refunded';
            returnRequest.refundProcessedAt = Date.now();
            returnRequest.refundId = 'REFUND_' + Date.now();
            await returnRequest.save();
        }, 2000);

        res.json({
            success: true,
            message: 'Refund processing initiated',
            data: returnRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing refund',
            error: error.message
        });
    }
};

// Cancel return request
const cancelReturn = async (req, res) => {
    try {
        const { returnId } = req.params;

        const returnRequest = await Return.findById(returnId);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return not found'
            });
        }

        // Check if user owns this return
        if (returnRequest.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this return'
            });
        }

        // Check if return can be cancelled
        if (!['requested', 'approved'].includes(returnRequest.status)) {
            return res.status(400).json({
                success: false,
                message: 'Return cannot be cancelled at this stage'
            });
        }

        returnRequest.status = 'cancelled';
        returnRequest.timeline.push({
            status: 'cancelled',
            message: 'Return cancelled by user',
            timestamp: Date.now()
        });

        await returnRequest.save();

        res.json({
            success: true,
            message: 'Return cancelled successfully',
            data: returnRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cancelling return',
            error: error.message
        });
    }
};

module.exports = {
    requestReturn,
    getUserReturns,
    getSellerReturns,
    getReturnDetails,
    sellerRespondToReturn,
    schedulePickup,
    processRefund,
    cancelReturn
};
