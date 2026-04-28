const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    
    // Discount details
    discountType: {
        type: String,
        enum: ['percentage', 'fixed', 'free_shipping'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    maxDiscount: Number, // For percentage discounts
    
    // Applicability
    minOrderValue: {
        type: Number,
        default: 0
    },
    maxOrderValue: Number,
    applicableCategories: [String],
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    applicableSellers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller'
    }],
    
    // Usage limits
    usageLimit: {
        type: Number,
        default: null // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    perUserLimit: {
        type: Number,
        default: 1
    },
    
    // Validity
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Description
    description: String,
    terms: String,
    
    // Created by
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Check if coupon is valid
couponSchema.methods.isValid = function() {
    const now = new Date();
    return this.isActive && 
           now >= this.startDate && 
           now <= this.endDate &&
           (this.usageLimit === null || this.usedCount < this.usageLimit);
};

// Check if user can use coupon
couponSchema.methods.canUserUse = async function(userId) {
    const CouponUsage = mongoose.model('CouponUsage');
    const usageCount = await CouponUsage.countDocuments({
        coupon: this._id,
        user: userId
    });
    return usageCount < this.perUserLimit;
};

module.exports = mongoose.model('Coupon', couponSchema);
