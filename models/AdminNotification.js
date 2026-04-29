const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['seller_registration', 'grievance', 'withdrawal_request', 'system'],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },  // sellerId, grievanceId, etc.
    referenceModel: { type: String },  // 'Seller', 'Grievance', etc.
    isRead: { type: Boolean, default: false },
    actionRequired: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
