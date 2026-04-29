const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// Helper to get Razorpay Instance
const getRazorpayInstance = () => {
    console.log('--- Razorpay Connection Debug ---');
    console.log('Key ID exists:', !!process.env.RAZORPAY_KEY_ID);
    console.log('Key Secret exists:', !!process.env.RAZORPAY_KEY_SECRET);

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// @desc    Create Razorpay Order for Top-up (Deposit)
exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        console.log('Searching for wallet for user:', req.user.id);
        // Ensure wallet exists (Auto-create if missing)
        const userWallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { user: req.user.id },
            { upsert: true, new: true }
        );
        console.log('Wallet result:', userWallet ? 'FOUND' : 'MISSING');

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: `dep_${Date.now()}`
        });

        await Transaction.create({
            wallet: userWallet._id,
            user: req.user.id,
            type: 'deposit',
            amount: amount,
            status: 'pending',
            description: 'Wallet Top-up',
            razorpayOrderId: order.id
        });

        res.status(200).json({ success: true, order });
    } catch (err) {
        console.error('Create Order Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Verify Deposit Payment
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            const transaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
            if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

            transaction.status = 'completed';
            transaction.razorpayPaymentId = razorpay_payment_id;
            await transaction.save();

            const wallet = await Wallet.findById(transaction.wallet);
            wallet.balance += transaction.amount;
            wallet.updatedAt = Date.now();
            await wallet.save();

            res.status(200).json({ success: true, balance: wallet.balance });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Request Withdrawal (Payout)
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.id);
        const wallet = await Wallet.findOne({ user: req.user.id });

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        if (!user.creatorProfile || !user.creatorProfile.bankDetails || (!user.creatorProfile.bankDetails.accountNumber && !user.creatorProfile.bankDetails.upiId)) {
            return res.status(400).json({ message: 'Please setup bank details or UPI ID first' });
        }

        // 1. Create Payout Transaction (status: processing)
        const transaction = await Transaction.create({
            wallet: wallet._id,
            user: req.user.id,
            type: 'payout',
            amount: amount,
            status: 'processing',
            description: 'Withdrawal to Bank'
        });

        // 2. Create Withdrawal Request
        const withdrawal = await Withdrawal.create({
            user: req.user.id,
            wallet: wallet._id,
            amount: amount,
            bankDetails: user.creatorProfile.bankDetails,
            transactionId: transaction._id
        });

        // 3. Deduct from wallet immediately to "hold" the funds
        wallet.balance -= amount;
        await wallet.save();

        res.status(201).json({ success: true, withdrawal });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get transaction history
exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, transactions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get Financial Summary
exports.getSummary = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ user: req.user.id });
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10);
        const withdrawals = await Withdrawal.find({ user: req.user.id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            balance: wallet ? wallet.balance : 0,
            transactions,
            withdrawals
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
