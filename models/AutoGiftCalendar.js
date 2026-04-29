const mongoose = require('mongoose');

const autoGiftCalendarSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Recipient details
    recipient: {
        name: {
            type: String,
            required: true
        },
        relationship: {
            type: String,
            required: true,
            enum: ['partner', 'parent', 'friend', 'sibling', 'colleague', 'teacher', 'child', 'other']
        },
        phone: String,
        email: String
    },
    
    // Occasion details
    occasion: {
        type: String,
        required: true,
        enum: ['birthday', 'anniversary', 'wedding', 'diwali', 'christmas', 'valentine', 'raksha_bandhan', 'fathers_day', 'mothers_day', 'other']
    },
    customOccasion: String,
    
    // Date and time
    occasionDate: {
        type: Date,
        required: true
    },
    occasionTime: String, // e.g., "10:00 AM"
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    
    // Recurring
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        type: String,
        enum: ['yearly', 'monthly', 'weekly']
    },
    
    // Delivery address (required)
    deliveryAddress: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            default: 'India'
        },
        landmark: String
    },
    
    // Pincode-based delivery estimation
    deliveryEstimation: {
        pincode: String,
        estimatedDays: Number,
        requiredDaysBefore: Number, // How many days before occasion to place order
        suggestedOrderDate: Date,
        lastCalculated: Date
    },
    
    // Gift preferences
    giftPreferences: {
        budget: {
            min: Number,
            max: Number
        },
        categories: [String],
        interests: [String],
        avoid: [String],
        aiSuggestions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }]
    },
    
    // Gift selection
    selectedGifts: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            default: 1
        },
        customization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customization'
        },
        message: String
    }],
    
    // Order status
    orderStatus: {
        type: String,
        enum: ['pending', 'ordered', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'],
        default: 'pending'
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    
    // Payment
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentId: String,

    // Autonomous Mode (Phase 6)
    isAutonomous: {
        type: Boolean,
        default: false
    },
    approvalRequired: {
        type: Boolean,
        default: true
    },
    autoSelectionCriteria: {
        maxBudget: Number,
        preferredStyle: [String],
        aiTone: {
            type: String,
            enum: ['funny', 'emotional', 'formal', 'romantic'],
            default: 'emotional'
        }
    },
    
    // Reminders
    remindersSent: [{
        type: String,
        enum: ['7_days', '3_days', '1_day', 'same_day'],
        sentAt: Date
    }],
    
    // Notifications
    notifications: {
        email: {
            type: Boolean,
            default: true
        },
        sms: {
            type: Boolean,
            default: false
        },
        push: {
            type: Boolean,
            default: true
        }
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'failed'],
        default: 'active'
    },
    
    // Notes
    notes: String,
    
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
autoGiftCalendarSchema.index({ user: 1 });
autoGiftCalendarSchema.index({ occasionDate: 1 });
autoGiftCalendarSchema.index({ status: 1 });
autoGiftCalendarSchema.index({ 'deliveryAddress.pincode': 1 });

// Calculate delivery estimation before save
autoGiftCalendarSchema.pre('save', function() {
    if (this.isModified('deliveryAddress.pincode') || this.isNew) {
        // Calculate estimated delivery days based on pincode
        // This would typically integrate with a shipping API
        // For now, using a simple estimation
        const pincode = this.deliveryAddress.pincode;
        
        // Simple logic: 6-digit Indian pincodes
        // First 3 digits indicate region
        const regionCode = pincode.substring(0, 3);
        
        // Estimated days based on region (simplified)
        let estimatedDays = 5; // Default
        if (['110', '100', '001'].includes(regionCode)) {
            estimatedDays = 2; // Metro cities
        } else if (['400', '500', '600'].includes(regionCode)) {
            estimatedDays = 3; // Major cities
        } else {
            estimatedDays = 5; // Other areas
        }
        
        this.deliveryEstimation = {
            pincode,
            estimatedDays,
            requiredDaysBefore: estimatedDays + 2, // 2 days buffer
            suggestedOrderDate: new Date(this.occasionDate.getTime() - (estimatedDays + 2) * 24 * 60 * 60 * 1000),
            lastCalculated: Date.now()
        };
    }
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('AutoGiftCalendar', autoGiftCalendarSchema);
