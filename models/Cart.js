const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Cart items
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        price: {
            type: Number,
            required: true
        },
        // Customization options
        customization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customization'
        },
        selectedVariants: {
            type: Map,
            of: String // e.g., { color: "red", size: "M" }
        },
        // Gift options
        giftWrap: {
            type: Boolean,
            default: false
        },
        giftWrapType: String,
        giftMessage: String,
        // Save for later
        savedForLater: {
            type: Boolean,
            default: false
        },
        savedAt: Date,
        // Timestamp
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Coupon applied
    appliedCoupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    
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
cartSchema.index({ 'items.product': 1 });

// Update timestamp on save
cartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Calculate total
cartSchema.methods.calculateTotal = function() {
    let total = 0;
    this.items.forEach(item => {
        if (!item.savedForLater) {
            total += item.price * item.quantity;
        }
    });
    return total - this.discountAmount;
};

// Get active items (not saved for later)
cartSchema.methods.getActiveItems = function() {
    return this.items.filter(item => !item.savedForLater);
};

// Get saved items
cartSchema.methods.getSavedItems = function() {
    return this.items.filter(item => item.savedForLater);
};

module.exports = mongoose.model('Cart', cartSchema);
