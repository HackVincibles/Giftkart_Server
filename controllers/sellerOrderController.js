const Order = require('../models/Order');
const Product = require('../models/Product');
const OrderTracking = require('../models/OrderTracking');

// Get list of orders for seller
const getSellerOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const sellerId = req.seller._id;

        // Find all products by this seller
        const sellerProducts = await Product.find({ creator: sellerId }).select('_id');
        const sellerProductIds = sellerProducts.map(p => p._id);

        // Find orders containing any of these products
        const filter = {
            'products.product': { $in: sellerProductIds }
        };

        if (status) {
            filter.status = status;
        }

        const orders = await Order.find(filter)
            .populate('buyer', 'name email phone')
            .populate('products.product', 'name images category basePrice')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

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
            message: 'Error fetching seller orders',
            error: error.message
        });
    }
};

// Get single order details
const getSellerOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const sellerId = req.seller._id;

        const sellerProducts = await Product.find({ creator: sellerId }).select('_id');
        const sellerProductIds = sellerProducts.map(p => p._id.toString());

        const order = await Order.findById(orderId)
            .populate('buyer', 'name email phone')
            .populate('products.product', 'name images category basePrice creator');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if the order has at least one product from this seller
        const hasSellerProduct = order.products.some(p => {
            const productCreatorId = p.product?.creator?.toString();
            return sellerProductIds.includes(productCreatorId) || sellerProductIds.includes(p.product?._id?.toString());
        });

        if (!hasSellerProduct) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
        }

        // Also fetch tracking if available
        const tracking = await OrderTracking.findOne({ order: orderId });

        res.json({
            success: true,
            data: { order, tracking }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching order details',
            error: error.message
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingNumber, note } = req.body;
        const sellerId = req.seller._id;

        // Verify seller owns product in order
        const sellerProducts = await Product.find({ creator: sellerId }).select('_id');
        const sellerProductIds = sellerProducts.map(p => p._id.toString());

        const order = await Order.findById(orderId).populate('products.product', 'creator');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const hasSellerProduct = order.products.some(p => {
             return sellerProductIds.includes(p.product?._id?.toString()) || sellerProductIds.includes(p.product?.creator?.toString());
        });

        if (!hasSellerProduct) {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this order' });
        }

        // Allowed statuses for sellers: processing, packed, shipped, cancelled
        const allowedStatuses = ['processing', 'packed', 'shipped', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status for seller' });
        }

        order.status = status;
        if (trackingNumber) order.trackingNumber = trackingNumber;
        
        order.statusHistory.push({
            status,
            note: note || `Status updated to ${status} by seller`,
            updatedBy: 'seller',
            updatedAt: Date.now()
        });

        await order.save();

        // Update tracking if order tracking exists
        let tracking = await OrderTracking.findOne({ order: orderId });
        if (!tracking && status === 'shipped') {
            tracking = await OrderTracking.create({
                order: order._id,
                currentStage: 'shipped',
                trackingEvents: []
            });
        }
        
        if (tracking) {
            if (status === 'shipped') {
                 tracking.currentStage = 'shipped';
                 tracking.trackingEvents.push({
                     stage: 'shipped',
                     status: 'Shipped',
                     description: note || 'Seller has shipped the package.',
                     timestamp: Date.now()
                 });
                 if (trackingNumber && !tracking.courierDetails?.trackingNumber) {
                     tracking.courierDetails = { ...tracking.courierDetails, trackingNumber };
                 }
            } else if (status === 'cancelled') {
                 tracking.currentStage = 'cancelled';
            }
            await tracking.save();
        }

        res.json({
            success: true,
            message: 'Order status updated',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

module.exports = {
    getSellerOrders,
    getSellerOrder,
    updateOrderStatus
};
