const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sellerSchema = new mongoose.Schema({
    // Basic Information
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    ownerName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    
    // Business Details
    businessType: {
        type: String,
        enum: ['individual', 'partnership', 'company', 'llp'],
        default: 'individual'
    },
    gstNumber: {
        type: String,
        trim: true,
        sparse: true
    },
    panNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    
    // Business Address
    businessAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, default: 'India' }
    },
    
    // Bank Details
    bankDetails: {
        accountNumber: { type: String, required: true },
        ifscCode: { type: String, required: true, uppercase: true },
        bankName: { type: String, required: true },
        accountHolderName: { type: String, required: true }
    },
    
    // Verification Status
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'suspended'],
        default: 'pending'
    },
    verificationDocuments: [{
        type: {
            type: String,
            enum: ['pan', 'gst', 'address_proof', 'identity_proof', 'bank_proof']
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    rejectionReason: String,
    
    // Profile
    profileImage: String,
    coverImage: String,
    description: String,
    website: String,
    
    // Social Media
    socialMedia: {
        facebook: String,
        instagram: String,
        twitter: String,
        linkedin: String
    },
    
    // Seller Rating
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    
    // Statistics
    stats: {
        totalProducts: { type: Number, default: 0 },
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        activeProducts: { type: Number, default: 0 }
    },
    
    // Commission Settings
    commissionRate: {
        type: Number,
        default: 15, // 15% platform commission
        min: 5,
        max: 30
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: false
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspensionReason: String,
    
    // Wallet
    wallet: {
        balance: { type: Number, default: 0 },
        pendingWithdrawals: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 }
    },
    
    // Preferences
    preferences: {
        orderNotifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        lowStockAlert: { type: Boolean, default: true }
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastLoginAt: Date,

    // Security
    resetPasswordOTP: String,
    resetPasswordExpires: Date
}, {
    timestamps: true
});

// Indexes
sellerSchema.index({ verificationStatus: 1 });
sellerSchema.index({ isActive: 1 });
sellerSchema.index({ businessName: 'text', description: 'text' });

// Hash password before saving
sellerSchema.pre('save', async function() {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    this.updatedAt = Date.now();
});

// Method to compare password
sellerSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
sellerSchema.methods.getPublicProfile = function() {
    const seller = this.toObject();
    delete seller.password;
    delete seller.bankDetails;
    delete seller.verificationDocuments;
    return seller;
};

module.exports = mongoose.model('Seller', sellerSchema);
