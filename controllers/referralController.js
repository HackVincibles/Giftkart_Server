const Referral = require('../models/Referral');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');

// Generate and get referral code for a user
exports.getReferralCode = async (req, res) => {
    try {
        let user = await User.findById(req.user._id);
        
        if (!user.referralCode) {
            // Generate a unique code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            user.referralCode = `${user.displayName.split(' ')[0].toUpperCase()}${code}`;
            await user.save();
        }

        res.json({ success: true, code: user.referralCode });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating referral code' });
    }
};

// Process a referral (called during registration)
exports.processReferral = async (referralCode, newUserId) => {
    try {
        const referrer = await User.findOne({ referralCode });
        if (!referrer) return false;

        // Create referral record
        const referral = await Referral.create({
            referrer: referrer._id,
            referee: newUserId,
            referralCode,
            status: 'completed',
            completedAt: new Date()
        });

        // Reward both users
        const reward = 50;

        // 1. Reward Referrer
        const referrerWallet = await Wallet.findOneAndUpdate(
            { user: referrer._id },
            { $inc: { balance: reward } },
            { upsert: true, new: true }
        );
        await Transaction.create({
            wallet: referrerWallet._id,
            user: referrer._id,
            type: 'referral_reward',
            amount: reward,
            status: 'completed',
            description: 'Referral reward for inviting a friend'
        });

        // 2. Reward Referee (New User)
        const refereeWallet = await Wallet.findOneAndUpdate(
            { user: newUserId },
            { $inc: { balance: reward } },
            { upsert: true, new: true }
        );
        await Transaction.create({
            wallet: refereeWallet._id,
            user: newUserId,
            type: 'referral_reward',
            amount: reward,
            status: 'completed',
            description: 'Welcome reward for using a referral code'
        });

        return true;
    } catch (error) {
        console.error('Referral Processing Error:', error);
        return false;
    }
};

// Get user referral stats
exports.getReferralStats = async (req, res) => {
    try {
        const referrals = await Referral.find({ referrer: req.user._id }).populate('referee', 'displayName');
        const totalEarned = referrals.length * 50;

        res.json({
            success: true,
            count: referrals.length,
            totalEarned,
            referrals
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching referral stats' });
    }
};

// Verify if a referral code is valid (for cart discount)
exports.verifyReferralCode = async (req, res) => {
    try {
        const { code } = req.body;
        const User = require('../models/User');
        
        const referrer = await User.findOne({ referralCode: code });
        
        if (!referrer) {
            return res.status(404).json({ success: false, message: 'Invalid referral code' });
        }

        if (referrer._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot use your own code' });
        }

        res.json({
            success: true,
            message: 'Code applied! You got a 10% discount.',
            discountPercent: 10
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
};
