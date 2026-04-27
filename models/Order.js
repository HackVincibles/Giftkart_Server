const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    artisanName: String,
    designData: {
        elements: Array,
        frameStyle: String,
        frameSize: String
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    razorpay_order_id: {
        type: String,
        required: true
    },
    razorpay_payment_id: String,
    shippingAddress: {
        city: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number }
    },
    deliveryStatus: {
        type: String,
        enum: ['awaiting_creator', 'crafting', 'out_for_delivery', 'delivered'],
        default: 'awaiting_creator'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'shipped', 'delivered'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', OrderSchema);
