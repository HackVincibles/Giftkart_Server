const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'expired'],
        default: 'pending'
    },
    rewardAmount: {
        type: Number,
        default: 50 // ₹50 reward
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
});

module.exports = mongoose.model('Referral', referralSchema);
