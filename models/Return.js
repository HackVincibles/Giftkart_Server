const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    
    // Return details
    reason: {
        type: String,
        required: true,
        enum: [
            'damaged',
            'wrong_item',
            'not_as_described',
            'quality_issue',
            'changed_mind',
            'defective',
            'missing_parts',
            'other'
        ]
    },
    description: String,
    
    // Items being returned
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        reason: String,
        condition: {
            type: String,
            enum: ['new', 'used', 'damaged', 'opened'],
            required: true
        },
        images: [String]
    }],
    
    // Return status
    status: {
        type: String,
        enum: ['requested', 'approved', 'rejected', 'picked_up', 'received', 'processing', 'refunded', 'completed'],
        default: 'requested'
    },
    
    // Refund details
    refundType: {
        type: String,
        enum: ['original_payment', 'wallet', 'bank_transfer'],
        default: 'original_payment'
    },
    refundAmount: Number,
    refundStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    refundId: String, // Razorpay refund ID
    refundProcessedAt: Date,
    
    // Pickup details
    pickupAddress: {
        name: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    },
    pickupScheduled: {
        type: Boolean,
        default: false
    },
    pickupDate: Date,
    pickupTimeSlot: String,
    trackingNumber: String,
    
    // Seller response
    sellerResponse: {
        approved: Boolean,
        response: String,
        respondedAt: Date,
        rejectedReason: String
    },
    
    // Admin review (if disputed)
    adminReview: {
        reviewed: Boolean,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        decision: String,
        notes: String,
        reviewedAt: Date
    },
    
    // Timeline
    timeline: [{
        status: String,
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Metadata
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
returnSchema.index({ order: 1 });
returnSchema.index({ user: 1 });
returnSchema.index({ seller: 1 });
returnSchema.index({ status: 1 });
returnSchema.index({ createdAt: -1 });

// Add timeline entry on status change
returnSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.timeline.push({
            status: this.status,
            message: `Status changed to ${this.status}`,
            timestamp: Date.now()
        });
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Return', returnSchema);
