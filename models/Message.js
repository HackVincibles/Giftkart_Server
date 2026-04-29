const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'senderModel'
    },
    senderModel: {
        type: String,
        required: true,
        enum: ['User', 'Seller']
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientModel'
    },
    recipientModel: {
        type: String,
        required: true,
        enum: ['User', 'Seller']
    },
    content: {
        type: String,
        required: true
    },
    attachments: [{
        url: String,
        type: { type: String, enum: ['image', 'document'] }
    }],
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

messageSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
