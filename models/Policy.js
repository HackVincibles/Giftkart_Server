const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['refund', 'shipping', 'privacy', 'terms', 'cancellation', 'return'],
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    version: {
        type: String,
        default: '1.0'
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Policy', policySchema);
