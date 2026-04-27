const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async (req, res) => {
    try {
        const { amount, artisanName, designData } = req.body;

        const options = {
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            receipt: `receipt_order_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        const newOrder = new Order({
            buyer: req.user._id,
            artisanName,
            designData,
            amount,
            razorpay_order_id: razorpayOrder.id,
            status: 'pending'
        });

        await newOrder.save();

        res.status(201).json({
            success: true,
            order: razorpayOrder,
            dbOrderId: newOrder._id
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            await Order.findOneAndUpdate(
                { razorpay_order_id },
                { 
                    status: 'paid', 
                    razorpay_payment_id 
                }
            );

            res.status(200).json({ success: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};
