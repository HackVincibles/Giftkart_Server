const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    
    // Grievance details
    category: {
        type: String,
        enum: [
            'product_quality',
            'delivery_issue',
            'payment_issue',
            'seller_behavior',
            'platform_issue',
            'refund_issue',
            'other'
        ],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    
    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Status
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed', 'escalated'],
        default: 'open'
    },
    
    // Attachments
    attachments: [{
        type: String,
        uploadedAt: Date
    }],
    
    // Resolution
    resolution: {
        resolved: Boolean,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolutionDetails: String,
        resolvedAt: Date
    },
    
    // Communication
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        senderType: {
            type: String,
            enum: ['user', 'admin', 'system']
        },
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        attachments: [String]
    }],
    
    // Escalation
    escalated: {
        type: Boolean,
        default: false
    },
    escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalatedAt: Date,
    escalationReason: String,
    
    // Feedback
    userFeedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String,
        submittedAt: Date
    },
    
    // SLA tracking
    sla: {
        responseDue: Date,
        resolutionDue: Date,
        firstResponseAt: Date,
        responseTime: Number // in hours
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
grievanceSchema.index({ user: 1 });
grievanceSchema.index({ order: 1 });
grievanceSchema.index({ status: 1 });
grievanceSchema.index({ category: 1 });
grievanceSchema.index({ createdAt: -1 });

// Set SLA on creation
grievanceSchema.pre('save', function(next) {
    if (this.isNew) {
        // Set response SLA (24 hours)
        this.sla.responseDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Set resolution SLA (7 days)
        this.sla.resolutionDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Grievance', grievanceSchema);
