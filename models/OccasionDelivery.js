const mongoose = require('mongoose');

const occasionDeliverySchema = new mongoose.Schema({
    // Occasion type
    occasion: {
        type: String,
        enum: ['birthday', 'anniversary', 'wedding', 'diwali', 'christmas', 'valentine', 'raksha_bandhan', 'fathers_day', 'mothers_day', 'new_year', 'eid', 'holi', 'other'],
        required: true
    },
    customOccasion: String,
    
    // Delivery date requirements
    preferredDeliveryDate: {
        type: Date,
        required: true
    },
    isFlexible: {
        type: Boolean,
        default: false
    },
    flexibleRange: {
        daysBefore: Number,
        daysAfter: Number
    },
    
    // Time preferences
    preferredTimeSlot: {
        type: String,
        enum: ['morning_9_12', 'afternoon_12_3', 'evening_3_6', 'evening_6_9', 'anytime'],
        default: 'anytime'
    },
    
    // Special handling requirements
    specialHandling: {
        type: String,
        enum: ['standard', 'fragile', 'perishable', 'live_plant', 'custom'],
        default: 'standard'
    },
    handlingInstructions: String,
    
    // Packaging
    giftWrap: {
        type: Boolean,
        default: false
    },
    giftWrapTheme: String,
    giftCardMessage: String,
    
    // Recipient surprise
    isSurprise: {
        type: Boolean,
        default: false
    },
    surpriseInstructions: String,
    
    // Related order
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    autoGift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AutoGiftCalendar'
    },
    
    // Delivery confirmation
    notifyBeforeDelivery: {
        type: Boolean,
        default: true
    },
    notifyOnDelivery: {
        type: Boolean,
        default: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'in_transit', 'delivered', 'missed', 'rescheduled'],
        default: 'pending'
    },
    
    // Actual delivery
    actualDeliveryDate: Date,
    actualTimeSlot: String,
    deliveryPhoto: String,
    recipientSignature: String,
    
    // Feedback
    deliveryFeedback: {
        onTime: Boolean,
        condition: String,
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String
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
occasionDeliverySchema.index({ occasion: 1 });
occasionDeliverySchema.index({ preferredDeliveryDate: 1 });
occasionDeliverySchema.index({ order: 1 });
occasionDeliverySchema.index({ status: 1 });

// Pre-save hook
occasionDeliverySchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Method to check if delivery is on time
occasionDeliverySchema.methods.isOnTime = function() {
    if (!this.actualDeliveryDate) return false;
    if (this.isFlexible) {
        const minDate = new Date(this.preferredDeliveryDate);
        minDate.setDate(minDate.getDate() - (this.flexibleRange.daysBefore || 0));
        const maxDate = new Date(this.preferredDeliveryDate);
        maxDate.setDate(maxDate.getDate() + (this.flexibleRange.daysAfter || 0));
        return this.actualDeliveryDate >= minDate && this.actualDeliveryDate <= maxDate;
    }
    return this.actualDeliveryDate.toDateString() === this.preferredDeliveryDate.toDateString();
};

module.exports = mongoose.model('OccasionDelivery', occasionDeliverySchema);
