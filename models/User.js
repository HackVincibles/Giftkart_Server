const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows nulls for email/pass users
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        select: false // Hide password by default in queries
    },
    authMethod: {
        type: String,
        enum: ['google', 'local'],
        default: 'local'
    },
    displayName: {
        type: String,
        required: true
    },
    avatar: String,
    phoneNumber: String,
    billingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    role: {
        type: String,
        enum: ['buyer', 'creator', 'admin', 'unassigned'],
        default: 'unassigned'
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    buyerProfile: {
        preferences: [String],
        interests: [String],
        shippingAddress: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: { type: String, default: 'India' }
        },
        savedOccasions: [{
            name: String,
            date: Date,
            relationship: String
        }]
    },
    creatorProfile: {
        studioName: String,
        businessName: String,
        bio: String,
        portfolioLinks: [String],
        phone: String,
        businessAddress: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: { type: String, default: 'India' }
        },
        panNumber: { type: String, uppercase: true },
        gstNumber: { type: String, uppercase: true },
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected', 'suspended'],
            default: 'pending'
        },
        bankDetails: {
            accountNumber: String,
            ifsc: String,
            bankName: String,
            accountHolderName: String,
            upiId: String
        },
        stats: {
            totalProducts: { type: Number, default: 0 },
            totalOrders: { type: Number, default: 0 },
            totalRevenue: { type: Number, default: 0 }
        },
        wallet: {
            balance: { type: Number, default: 0 },
            pendingWithdrawals: { type: Number, default: 0 },
            totalEarned: { type: Number, default: 0 }
        }
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockedAt: Date,
    blockReason: String,
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user-entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

