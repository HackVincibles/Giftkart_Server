const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: false // Made optional for direct order transactions
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: false
    },
    type: {
        type: String,
        enum: ['deposit', 'payout', 'purchase', 'refund', 'withdrawal'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'processing', 'reversed'],
        default: 'pending'
    },
    description: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    withdrawalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Withdrawal'
    },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ wallet: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
