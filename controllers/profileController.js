const User = require('../models/User');
const Seller = require('../models/Seller');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { sendEmail } = require('../services/emailService');

/**
 * @desc    Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        const wallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { $setOnInsert: { user: req.user.id, balance: 0 } },
            { upsert: true, new: true }
        );

        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10);
        
        res.status(200).json({
            success: true,
            profile: user,
            wallet,
            transactions: transactions || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Update basic profile
 */
const updateProfile = async (req, res) => {
    try {
        const { displayName, phoneNumber, avatar, billingAddress } = req.body;
        const user = await User.findById(req.user.id);

        if (displayName) user.displayName = displayName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (avatar !== undefined) user.avatar = avatar;
        if (billingAddress) user.billingAddress = billingAddress;

        await user.save();
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Update role-specific profile
 */
const updateRoleData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { bankDetails } = req.body;
        
        if (user.role === 'buyer') {
            const { interests, shippingAddress } = req.body;
            if (interests) user.buyerProfile.interests = interests;
            if (shippingAddress) user.buyerProfile.shippingAddress = shippingAddress;
            if (bankDetails) {
                if (!user.creatorProfile) user.creatorProfile = {};
                user.creatorProfile.bankDetails = bankDetails;
            }
        } else if (user.role === 'creator') {
            const { studioName, bio, portfolioLinks } = req.body;
            if (studioName) user.creatorProfile.studioName = studioName;
            if (bio) user.creatorProfile.bio = bio;
            if (portfolioLinks) user.creatorProfile.portfolioLinks = portfolioLinks;
            if (bankDetails) user.creatorProfile.bankDetails = bankDetails;
        }

        await user.save();
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Request account deletion
 */
const requestAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);
        let isSeller = false;

        if (!user) {
            user = await Seller.findById(userId);
            isSeller = true;
        }

        if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
        
        // Admins cannot delete their own accounts via this route for security
        if (user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // For Sellers, we might need to add these fields to the model or use a separate collection
        // but for now let's assume User model covers most cases or add fields to Seller
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #dc2626;">⚠️ Account Deletion Request</h2>
                <p>Hello ${user.displayName || user.businessName},</p>
                <p>We received a request to permanently delete your GiftKart account. This action is irreversible and will remove all your data, products, and wallet balance.</p>
                <p>Enter this OTP to confirm deletion:</p>
                <div style="background: #fef2f2; padding: 1.5rem; text-align: center; border-radius: 12px; margin: 1.5rem 0; border: 2px dashed #fca5a5;">
                    <h1 style="letter-spacing: 8px; color: #dc2626; margin: 0; font-size: 2.5rem;">${otp}</h1>
                </div>
                <p>This OTP expires in 10 minutes. If you did not request this, please secure your account immediately.</p>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: '⚠️ Account Deletion Verification - GiftKart',
            html
        });

        res.status(200).json({ success: true, message: 'Verification OTP sent to your email.' });
    } catch (err) {
        console.error('Delete request error:', err);
        res.status(500).json({ success: false, message: 'Failed to send verification email.' });
    }
};

/**
 * @desc    Confirm account deletion
 */
const confirmAccountDeletion = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp) return res.status(400).json({ success: false, message: 'OTP is required.' });

        const userId = req.user.id;
        let user = await User.findById(userId).select('+resetPasswordOTP +resetPasswordExpires');
        let isSeller = false;

        if (!user) {
            user = await Seller.findById(userId).select('+resetPasswordOTP +resetPasswordExpires');
            isSeller = true;
        }

        if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

        if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        if (user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired.' });
        }

        const userEmail = user.email;
        const Product = require('../models/Product');
        const CreatorDashboard = require('../models/CreatorDashboard');

        // Comprehensive Cleanup
        if (isSeller) {
            // Delete all products where this seller is the creator
            await Product.deleteMany({ creator: userId });
            // Delete creator dashboard
            await CreatorDashboard.deleteMany({ creator: userId });
            // Delete the seller account
            await Seller.findByIdAndDelete(userId);
        } else {
            // If it's a creator role User, they might have products too
            if (user.role === 'creator') {
                await Product.deleteMany({ creator: userId });
                await CreatorDashboard.deleteMany({ creator: userId });
            }
            
            // Cleanup wallet and transactions
            await Wallet.deleteMany({ user: userId });
            await Transaction.deleteMany({ user: userId });
            // Delete the user account
            await User.findByIdAndDelete(userId);
        }

        try {
            await sendEmail({
                email: userEmail,
                subject: 'Account Deleted - GiftKart',
                html: '<h2>Account Successfully Deleted</h2><p>Your GiftKart account and all associated data have been permanently removed. We are sorry to see you go.</p>'
            });
        } catch (e) {}

        res.status(200).json({ success: true, message: 'Your account has been permanently deleted.' });
    } catch (err) {
        console.error('Delete confirmation error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete account.' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updateRoleData,
    requestAccountDeletion,
    confirmAccountDeletion
};
