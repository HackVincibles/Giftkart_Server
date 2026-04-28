const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const { logger } = require('../services/logger');

// Create coupon (admin only)
const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            maxDiscount,
            minOrderValue,
            maxOrderValue,
            applicableCategories,
            applicableProducts,
            applicableSellers,
            usageLimit,
            perUserLimit,
            startDate,
            endDate,
            description,
            terms
        } = req.body;

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            maxDiscount,
            minOrderValue,
            maxOrderValue,
            applicableCategories,
            applicableProducts,
            applicableSellers,
            usageLimit,
            perUserLimit,
            startDate,
            endDate,
            description,
            terms,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            data: coupon
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating coupon',
            error: error.message
        });
    }
};

// Get all coupons (admin)
const getAllCoupons = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const filter = {};
        if (status === 'active') {
            filter.isActive = true;
        } else if (status === 'inactive') {
            filter.isActive = false;
        }

        const coupons = await Coupon.find(filter)
            .populate('applicableProducts')
            .populate('applicableSellers')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Coupon.countDocuments(filter);

        res.json({
            success: true,
            data: {
                coupons,
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
            message: 'Error fetching coupons',
            error: error.message
        });
    }
};

// Get active coupons (public)
const getActiveCoupons = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: coupons
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching active coupons',
            error: error.message
        });
    }
};

// Validate coupon
const validateCoupon = async (req, res) => {
    try {
        const { code, orderValue, category, productId, sellerId } = req.body;

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Check if coupon is valid
        if (!coupon.isValid()) {
            return res.status(400).json({
                success: false,
                message: 'Coupon is expired or inactive'
            });
        }

        // Check minimum order value
        if (orderValue < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value is ${coupon.minOrderValue}`
            });
        }

        // Check maximum order value
        if (coupon.maxOrderValue && orderValue > coupon.maxOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Maximum order value is ${coupon.maxOrderValue}`
            });
        }

        // Check category applicability
        if (coupon.applicableCategories.length > 0 && !coupon.applicableCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Coupon not applicable for this category'
            });
        }

        // Check product applicability
        if (coupon.applicableProducts.length > 0 && !coupon.applicableProducts.includes(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Coupon not applicable for this product'
            });
        }

        // Check seller applicability
        if (coupon.applicableSellers.length > 0 && !coupon.applicableSellers.includes(sellerId)) {
            return res.status(400).json({
                success: false,
                message: 'Coupon not applicable for this seller'
            });
        }

        // Check user usage limit
        if (req.user) {
            const canUse = await coupon.canUserUse(req.user._id);
            if (!canUse) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already used this coupon the maximum number of times'
                });
            }
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderValue * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else if (coupon.discountType === 'fixed') {
            discountAmount = coupon.discountValue;
        } else if (coupon.discountType === 'free_shipping') {
            discountAmount = 0; // Shipping cost to be calculated separately
        }

        res.json({
            success: true,
            message: 'Coupon is valid',
            data: {
                couponId: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: Math.round(discountAmount * 100) / 100,
                description: coupon.description
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error validating coupon',
            error: error.message
        });
    }
};

// Apply coupon to order
const applyCoupon = async (req, res) => {
    try {
        const { couponId, orderId, discountAmount, originalAmount } = req.body;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Create coupon usage record
        const couponUsage = await CouponUsage.create({
            coupon: couponId,
            user: req.user._id,
            order: orderId,
            discountAmount,
            originalAmount
        });

        // Update coupon usage count
        coupon.usedCount += 1;
        await coupon.save();

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            data: couponUsage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error applying coupon',
            error: error.message
        });
    }
};

// Get user's coupon usage history
const getUserCouponHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const couponUsages = await CouponUsage.find({ user: req.user._id })
            .populate('coupon')
            .populate('order')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await CouponUsage.countDocuments({ user: req.user._id });

        res.json({
            success: true,
            data: {
                couponUsages,
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
            message: 'Error fetching coupon history',
            error: error.message
        });
    }
};

// Update coupon (admin)
const updateCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const updates = req.body;

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            updates,
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            message: 'Coupon updated successfully',
            data: coupon
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating coupon',
            error: error.message
        });
    }
};

// Delete coupon (admin)
const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Soft delete
        coupon.isActive = false;
        await coupon.save();

        res.json({
            success: true,
            message: 'Coupon deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting coupon',
            error: error.message
        });
    }
};

module.exports = {
    createCoupon,
    getAllCoupons,
    getActiveCoupons,
    validateCoupon,
    applyCoupon,
    getUserCouponHistory,
    updateCoupon,
    deleteCoupon
};
