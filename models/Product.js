const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['semi-custom', 'fully-custom', 'standard', 'ai-generated'],
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    basePrice: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    internationalPrices: {
        USD: Number,
        EUR: Number,
        GBP: Number
    },
    isInternational: {
        type: Boolean,
        default: false
    },
    images: [{
        url: String,
        alt: String
    }],
    customizableFields: [{
        fieldName: String,
        fieldType: {
            type: String,
            enum: ['text', 'image', 'color', 'number', 'boolean', 'select']
        },
        options: [String],
        required: Boolean,
        maxLength: Number
    }],
    templateData: {
        baseDesign: String,
        frameStyle: String,
        dimensions: {
            width: Number,
            height: Number,
            depth: Number
        },
        materials: [String]
    },
    aiTags: [{
        tag: String,
        confidence: Number,
        category: String
    }],
    emotionalContext: [{
        emotion: String,
        score: Number,
        occasions: [String]
    }],
    targetAudience: [{
        relationship: String,
        ageGroup: String,
        gender: String,
        personality: [String]
    }],
    pricing: {
        base: Number,
        customizationFee: Number,
        urgentDeliveryFee: Number,
        dynamicPricing: {
            enabled: Boolean,
            minPrice: Number,
            maxPrice: Number,
            demandMultiplier: Number
        }
    },
    inventory: {
        available: {
            type: Boolean,
            default: true
        },
        stockCount: {
            type: Number,
            default: 999
        },
        productionTime: {
            normal: Number, // in days
            urgent: Number // in days
        }
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: Number,
        emotionalImpactScore: Number,
        customizationQuality: Number,
        deliveryTimeliness: Number,
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    emotionalImpactAverage: {
        type: Number,
        default: 0
    },
    popularity: {
        views: {
            type: Number,
            default: 0
        },
        orders: {
            type: Number,
            default: 0
        },
        wishlistCount: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for search
ProductSchema.index({ name: 'text', description: 'text', aiTags: 'text' });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ creator: 1 });
ProductSchema.index({ 'emotionalContext.emotion': 1 });
ProductSchema.index({ 'targetAudience.relationship': 1 });

// Update average ratings before saving
ProductSchema.pre('save', function() {
    if (this.reviews && this.reviews.length > 0) {
        const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        const totalEmotional = this.reviews.reduce((sum, review) => sum + review.emotionalImpactScore, 0);
        this.averageRating = totalRating / this.reviews.length;
        this.emotionalImpactAverage = totalEmotional / this.reviews.length;
    }
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Product', ProductSchema);
