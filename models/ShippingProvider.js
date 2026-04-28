const mongoose = require('mongoose');

const shippingProviderSchema = new mongoose.Schema({
    // Provider details
    name: {
        type: String,
        required: true,
        enum: ['delhivery', 'bluedart', 'ekart', 'dtdc', 'fedex', 'ups', 'dhl', 'shiprocket', 'custom']
    },
    displayName: String,
    
    // API credentials
    credentials: {
        apiKey: String,
        apiSecret: String,
        accountId: String,
        authCode: String
    },
    
    // Service types
    services: [{
        name: String,
        code: String,
        description: String,
        isActive: Boolean
    }],
    
    // Pricing
    pricing: {
        baseRate: Number,
        ratePerKg: Number,
        ratePerKm: Number,
        codCharges: Number,
        fuelSurcharge: Number
    },
    
    // Coverage
    coverage: {
        states: [String],
        pincodes: [String],
        excludedPincodes: [String]
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    
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
shippingProviderSchema.index({ name: 1 });
shippingProviderSchema.index({ isActive: 1 });

module.exports = mongoose.model('ShippingProvider', shippingProviderSchema);
