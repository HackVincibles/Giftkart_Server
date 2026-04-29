const mongoose = require('mongoose');

const deliveryScheduleSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true
    },
    
    // Preferred delivery date/time
    preferredDeliveryDate: {
        type: Date,
        required: true
    },
    preferredTimeSlot: {
        type: String,
        enum: ['morning_9_12', 'afternoon_12_3', 'evening_3_6', 'evening_6_9'],
        required: true
    },
    
    // Time slot details
    timeSlotDetails: {
        start: String, // e.g., "09:00"
        end: String    // e.g., "12:00"
    },
    
    // Address for delivery
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
    
    // Special instructions
    specialInstructions: String,
    giftMessage: String,
    giftWrap: {
        type: Boolean,
        default: false
    },
    giftWrapType: String,
    
    // Occasion info
    occasion: String,
    recipientName: String,
    
    // Scheduling status
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'failed', 'rescheduled'],
        default: 'pending'
    },
    
    // Confirmation
    confirmedAt: Date,
    confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Actual delivery
    actualDeliveryDate: Date,
    actualDeliveryTime: String,
    deliveredAt: Date,
    
    // Rescheduling
    rescheduleRequests: [{
        requestedDate: Date,
        requestedTimeSlot: String,
        reason: String,
        requestedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected']
        },
        respondedAt: Date,
        responseReason: String
    }],
    
    // Delivery partner assignment
    assignedPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller'
    },
    assignedAt: Date,
    
    // Notifications
    notificationsSent: [{
        type: {
            type: String,
            enum: ['confirmation', 'reminder', 'delay', 'reschedule', 'delivery']
        },
        sentAt: Date,
        channel: String
    }],
    
    // Metadata
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
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
deliveryScheduleSchema.index({ preferredDeliveryDate: 1 });
deliveryScheduleSchema.index({ status: 1 });

// Set time slot details based on preferred time slot
deliveryScheduleSchema.pre('save', function() {
    if (this.isModified('preferredTimeSlot') || this.isNew) {
        const timeSlots = {
            'morning_9_12': { start: '09:00', end: '12:00' },
            'afternoon_12_3': { start: '12:00', end: '15:00' },
            'evening_3_6': { start: '15:00', end: '18:00' },
            'evening_6_9': { start: '18:00', end: '21:00' }
        };
        
        this.timeSlotDetails = timeSlots[this.preferredTimeSlot] || timeSlots['morning_9_12'];
    }
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('DeliverySchedule', deliveryScheduleSchema);
