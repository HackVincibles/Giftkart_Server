const mongoose = require('mongoose');

const orderTrackingSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true
    },
    
    // Tracking stages
    currentStage: {
        type: String,
        enum: [
            'order_placed',
            'confirmed',
            'processing',
            'quality_check',
            'packaging',
            'ready_to_ship',
            'handed_to_courier',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'delivery_attempted',
            'returned_to_sender',
            'cancelled'
        ],
        default: 'order_placed'
    },
    
    // Detailed tracking events
    trackingEvents: [{
        stage: String,
        status: String,
        location: String,
        description: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        metadata: mongoose.Schema.Types.Mixed
    }],
    
    // Courier/Shipping details
    courierDetails: {
        courierName: String,
        trackingNumber: String,
        trackingUrl: String,
        estimatedDeliveryDate: Date,
        actualDeliveryDate: Date,
        deliveryTimeSlot: String,
        pickupDate: Date,
        shippedDate: Date
    },
    
    // Delivery address
    deliveryAddress: {
        name: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' },
        landmark: String
    },
    
    // Delivery attempts
    deliveryAttempts: [{
        attemptDate: Date,
        status: String,
        reason: String,
        nextAttemptDate: Date
    }],
    
    // ETA calculations
    eta: {
        min: Date,
        max: Date,
        calculatedAt: Date
    },
    
    // Real-time location (if available)
    currentLocation: {
        latitude: Number,
        longitude: Number,
        lastUpdated: Date,
        accuracy: Number
    },
    
    // Notifications sent
    notificationsSent: [{
        stage: String,
        sentAt: Date,
        channel: {
            type: String,
            enum: ['email', 'sms', 'push', 'whatsapp']
        },
        status: String
    }],
    
    // Delivery proof
    deliveryProof: {
        signature: String,
        photo: String,
        deliveredTo: String,
        relationship: String,
        timestamp: Date
    },
    
    // Issues/Delays
    issues: [{
        type: {
            type: String,
            enum: ['delay', 'damage', 'lost', 'wrong_address', 'recipient_unavailable', 'other']
        },
        description: String,
        reportedAt: Date,
        resolved: Boolean,
        resolvedAt: Date,
        resolution: String
    }],
    
    // Customer feedback
    customerFeedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String,
        submittedAt: Date
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
orderTrackingSchema.index({ currentStage: 1 });
orderTrackingSchema.index({ 'courierDetails.trackingNumber': 1 });
orderTrackingSchema.index({ createdAt: -1 });

// Add tracking event on stage change
orderTrackingSchema.pre('save', function() {
    if (this.isModified('currentStage')) {
        this.trackingEvents.push({
            stage: this.currentStage,
            status: this.currentStage,
            description: `Order status updated to ${this.currentStage}`,
            timestamp: Date.now()
        });
    }
    this.updatedAt = Date.now();
});

// Method to add tracking event
orderTrackingSchema.methods.addTrackingEvent = function(stage, location, description, metadata = {}) {
    this.trackingEvents.push({
        stage,
        status: stage,
        location,
        description,
        timestamp: Date.now(),
        metadata
    });
    this.currentStage = stage;
    return this.save();
};

// Method to update ETA
orderTrackingSchema.methods.updateETA = function(minDate, maxDate) {
    this.eta = {
        min: minDate,
        max: maxDate,
        calculatedAt: Date.now()
    };
    return this.save();
};

module.exports = mongoose.model('OrderTracking', orderTrackingSchema);
