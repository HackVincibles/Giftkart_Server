const mongoose = require('mongoose');

const CreatorDashboardSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true,
        unique: true
    },
    orderQueue: [{
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        customization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customization'
        },
        status: {
            type: String,
            enum: ['new', 'in-progress', 'awaiting-approval', 'completed', 'cancelled'],
            default: 'new'
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal'
        },
        deadline: Date,
        estimatedCompletionTime: Date,
        userInputs: {
            description: String,
            images: [String],
            customizations: mongoose.Schema.Types.Mixed
        },
        aiSuggestions: {
            design: [String],
            message: String,
            layout: String,
            confidence: Number
        },
        creatorNotes: String,
        assignedAt: {
            type: Date,
            default: Date.now
        },
        startedAt: Date,
        completedAt: Date
    }],
    earnings: {
        total: {
            type: Number,
            default: 0
        },
        pending: {
            type: Number,
            default: 0
        },
        available: {
            type: Number,
            default: 0
        },
        withdrawn: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'INR'
        },
        monthlyBreakdown: [{
            month: String,
            year: Number,
            earnings: Number,
            orders: Number
        }]
    },
    performance: {
        totalOrders: {
            type: Number,
            default: 0
        },
        completedOrders: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        },
        emotionalImpactScore: {
            type: Number,
            default: 0
        },
        onTimeDeliveryRate: {
            type: Number,
            default: 0
        },
        customizationQuality: {
            type: Number,
            default: 0
        },
        responseTime: {
            average: Number, // in hours
            current: Number
        }
    },
    demandInsights: {
        trendingGiftTypes: [{
            type: String,
            count: Number,
            growth: Number
        }],
        upcomingOccasions: [{
            occasion: String,
            date: Date,
            demandLevel: String
        }],
        searchTerms: [{
            term: String,
            frequency: Number,
            trend: String
        }],
        pricePreferences: {
            low: Number,
            medium: Number,
            high: Number
        }
    },
    aiDesignAssistance: {
        enabled: Boolean,
        autoLayout: Boolean,
        autoCaption: Boolean,
        autoResize: Boolean,
        suggestionsCount: {
            type: Number,
            default: 0
        },
        acceptedSuggestions: {
            type: Number,
            default: 0
        }
    },
    smartBundling: {
        enabled: Boolean,
        groupedOrders: [{
            orderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Order'
            },
            groupId: String,
            savings: Number,
            status: String
        }]
    },
    reputation: {
        badges: [{
            type: String,
            earnedAt: Date
        }],
        level: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
            default: 'bronze'
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        }
    },
    logistics: {
        preferredRegions: [String],
        pickupSchedule: {
            enabled: Boolean,
            timeSlots: [String]
        },
        deliveryPartners: [String]
    },
    notifications: [{
        type: {
            type: String,
            enum: ['new-order', 'order-update', 'payment', 'insight', 'system']
        },
        message: String,
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

CreatorDashboardSchema.index({ 'orderQueue.status': 1 });
CreatorDashboardSchema.index({ 'orderQueue.deadline': 1 });

module.exports = mongoose.model('CreatorDashboard', CreatorDashboardSchema);
