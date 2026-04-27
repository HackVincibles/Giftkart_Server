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
        bio: String,
        portfolioLinks: [String],
        isVerified: {
            type: Boolean,
            default: false
        },
        bankDetails: {
            accountNumber: String,
            ifsc: String,
            bankName: String,
            upiId: String
        }
    },
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

