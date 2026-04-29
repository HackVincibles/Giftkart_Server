const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        notes: String,
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        }
    }],
    // Shareable wishlist
    isPublic: {
        type: Boolean,
        default: false
    },
    shareUrl: String,
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Wishlist metadata
    name: {
        type: String,
        default: 'My Wishlist'
    },
    description: String,
    occasion: String, // e.g., "Birthday", "Anniversary"
    targetDate: Date,
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
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'products.product': 1 });
wishlistSchema.index({ isPublic: 1 });

// Update timestamp on save
wishlistSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
