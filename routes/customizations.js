const express = require('express');
const router = express.Router();
const Customization = require('../models/Customization');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, authenticateSeller } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimiter');

// Create customization for an order
router.post('/', 
    protect, 
    ...validationRules.customization,
    validate,
    async (req, res) => {
        try {
            const { orderId, productId, customizationType, ...customizationData } = req.body;

            // Verify order exists and belongs to user
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (order.buyer.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to customize this order'
                });
            }

            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Check if customization already exists for this order
            const existingCustomization = await Customization.findOne({ order: orderId });
            if (existingCustomization) {
                return res.status(400).json({
                    success: false,
                    message: 'Customization already exists for this order'
                });
            }

            const customization = await Customization.create({
                order: orderId,
                product: productId,
                user: req.user._id,
                customizationType,
                ...customizationData
            });

            res.status(201).json({
                success: true,
                message: 'Customization created successfully',
                data: customization
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating customization',
                error: error.message
            });
        }
    }
);

// Get customization by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const customization = await Customization.findById(req.params.id)
            .populate('order')
            .populate('product')
            .populate('user', 'displayName email');

        if (!customization) {
            return res.status(404).json({
                success: false,
                message: 'Customization not found'
            });
        }

        // Check authorization
        if (customization.user._id.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this customization'
            });
        }

        res.json({
            success: true,
            data: customization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching customization',
            error: error.message
        });
    }
});

// Update customization
router.put('/:id', protect, async (req, res) => {
    try {
        let customization = await Customization.findById(req.params.id);

        if (!customization) {
            return res.status(404).json({
                success: false,
                message: 'Customization not found'
            });
        }

        // Check authorization
        if (customization.user.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this customization'
            });
        }

        // Only allow updates if status is pending
        if (customization.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update customization that is already being processed'
            });
        }

        customization = await Customization.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Customization updated successfully',
            data: customization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating customization',
            error: error.message
        });
    }
});

// Creator updates customization (adds AI suggestions, notes, etc.)
router.put('/:id/creator-update', protect, authenticateSeller, async (req, res) => {
    try {
        const customization = await Customization.findById(req.params.id)
            .populate('product');

        if (!customization) {
            return res.status(404).json({
                success: false,
                message: 'Customization not found'
            });
        }

        // Verify seller owns the product
        if (customization.product.creator.toString() !== req.seller._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this customization'
            });
        }

        const { aiSuggestions, creatorNotes, status, estimatedCompletionTime } = req.body;

        if (aiSuggestions) {
            customization.aiSuggestions = aiSuggestions;
        }

        if (creatorNotes !== undefined) {
            customization.creatorNotes = creatorNotes;
        }

        if (status) {
            customization.status = status;
        }

        if (estimatedCompletionTime) {
            customization.estimatedCompletionTime = estimatedCompletionTime;
        }

        if (status === 'completed') {
            customization.actualCompletionTime = new Date();
        }

        await customization.save();

        res.json({
            success: true,
            message: 'Customization updated by creator',
            data: customization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating customization',
            error: error.message
        });
    }
});

// Get customizations for a user
router.get('/user/my-customizations', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const customizations = await Customization.find({ user: req.user._id })
            .populate('product', 'name images basePrice')
            .populate('order', 'amount status createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Customization.countDocuments({ user: req.user._id });

        res.json({
            success: true,
            count: customizations.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: customizations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching customizations',
            error: error.message
        });
    }
});

// Get pending customizations for creator
router.get('/creator/pending', protect, authenticateSeller, async (req, res) => {
    try {
        // Get all products by this seller
        const sellerProducts = await Product.find({ creator: req.seller._id }).select('_id');
        const productIds = sellerProducts.map(p => p._id);

        const customizations = await Customization.find({
            product: { $in: productIds },
            status: { $in: ['pending', 'processing'] }
        })
        .populate('user', 'displayName email phoneNumber')
        .populate('product', 'name basePrice')
        .populate('order', 'amount shippingAddress')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: customizations.length,
            data: customizations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending customizations',
            error: error.message
        });
    }
});

// Delete customization
router.delete('/:id', protect, async (req, res) => {
    try {
        const customization = await Customization.findById(req.params.id);

        if (!customization) {
            return res.status(404).json({
                success: false,
                message: 'Customization not found'
            });
        }

        // Check authorization
        if (customization.user.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this customization'
            });
        }

        // Only allow deletion if status is pending
        if (customization.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete customization that is already being processed'
            });
        }

        await Customization.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Customization deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting customization',
            error: error.message
        });
    }
});

module.exports = router;
