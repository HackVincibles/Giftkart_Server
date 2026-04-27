const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// @desc    Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const wallet = await Wallet.findOne({ user: req.user.id });
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10);
        
        res.status(200).json({
            success: true,
            profile: user,
            wallet: wallet || { balance: 0 },
            transactions: transactions || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update basic profile
// @route   PUT /api/profile/update
exports.updateProfile = async (req, res) => {
    try {
        const { displayName, phoneNumber, avatar, billingAddress } = req.body;
        const user = await User.findById(req.user.id);

        if (displayName) user.displayName = displayName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (avatar) user.avatar = avatar;
        if (billingAddress) user.billingAddress = billingAddress;

        await user.save();
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update role-specific profile (Buyer/Creator)
// @route   PUT /api/profile/role-data
exports.updateRoleData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (user.role === 'buyer') {
            const { interests, shippingAddress } = req.body;
            if (interests) user.buyerProfile.interests = interests;
            if (shippingAddress) user.buyerProfile.shippingAddress = shippingAddress;
        } else if (user.role === 'creator') {
            const { studioName, bio, portfolioLinks, bankDetails } = req.body;
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
