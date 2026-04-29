const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema({
    // Singleton - one admin wallet for the platform
    totalCommissionEarned: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingCommission: { type: Number, default: 0 },

    transactions: [{
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
        orderAmount: { type: Number, required: true },
        commissionRate: { type: Number, default: 4 },
        commissionAmount: { type: Number, required: true },
        type: { type: String, enum: ['commission', 'withdrawal', 'refund'], default: 'commission' },
        description: String,
        createdAt: { type: Date, default: Date.now }
    }],

    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AdminWallet', adminWalletSchema);
