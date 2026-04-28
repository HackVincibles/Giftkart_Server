const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    
    // Discount applied
    discountAmount: {
        type: Number,
        required: true
    },
    originalAmount: Number,
    
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
couponUsageSchema.index({ coupon: 1, user: 1 });
couponUsageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CouponUsage', couponUsageSchema);
