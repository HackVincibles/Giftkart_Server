const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller'
    },
    
    // Notification type
    type: {
        type: String,
        enum: [
            'order_placed',
            'order_confirmed',
            'order_shipped',
            'order_delivered',
            'order_cancelled',
            'payment_received',
            'payment_failed',
            'return_requested',
            'return_approved',
            'return_rejected',
            'refund_processed',
            'grievance_created',
            'grievance_resolved',
            'auto_gift_reminder',
            'auto_gift_suggestions',
            'schedule_added',
            'cart_added',
            'wishlist_added',
            'wishlist_price_drop',
            'new_product',
            'promotion',
            'system'
        ],
        required: true
    },
    
    // Content
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    
    // Related entities
    relatedOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    relatedProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    relatedGrievance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grievance'
    },
    
    // Action URL
    actionUrl: String,
    
    // Channels
    channels: {
        email: {
            sent: Boolean,
            sentAt: Date,
            status: String
        },
        push: {
            sent: Boolean,
            sentAt: Date,
            status: String
        },
        sms: {
            sent: Boolean,
            sentAt: Date,
            status: String
        },
        whatsapp: {
            sent: Boolean,
            sentAt: Date,
            status: String
        }
    },
    
    // Read status
    read: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    
    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    
    // Expiry
    expiresAt: Date,
    
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ seller: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
