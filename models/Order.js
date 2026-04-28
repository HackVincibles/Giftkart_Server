const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        name: String
    }],
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
        required: false // Made optional for wallet-only payments
    },
    razorpay_payment_id: String,
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'wallet'],
        default: 'razorpay'
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' },
        coordinates: { lat: Number, lng: Number }
    },
    deliveryStatus: {
        type: String,
        enum: ['awaiting_creator', 'crafting', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'awaiting_creator'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'shipped', 'delivered', 'refunded', 'cancelled'],
        default: 'pending'
    },
    customizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customization'
    },
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    notes: String,
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
OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ deliveryStatus: 1 });
OrderSchema.index({ razorpay_order_id: 1 });

module.exports = mongoose.model('Order', OrderSchema);
