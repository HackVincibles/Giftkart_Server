const Seller = require('../models/Seller');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AdminNotification = require('../models/AdminNotification');

// Generate JWT Token
const generateToken = (sellerId) => {
    return jwt.sign({ sellerId, type: 'seller' }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// Register Seller
const registerSeller = async (req, res) => {
    try {
        const {
            businessName,
            ownerName,
            email,
            phone,
            password,
            businessType,
            gstNumber,
            panNumber,
            businessAddress,
            bankDetails
        } = req.body;

        // Check if seller already exists
        const existingSeller = await Seller.findOne({ 
            $or: [{ email }, { phone }] 
        });

        if (existingSeller) {
            return res.status(400).json({
                success: false,
                message: 'Seller with this email or phone already exists'
            });
        }

        // Create seller
        const seller = await Seller.create({
            businessName,
            ownerName,
            email,
            phone,
            password,
            businessType,
            gstNumber,
            panNumber,
            businessAddress,
            bankDetails,
            verificationStatus: 'verified' // Auto-verified for demo purposes
        });

        // Notify admin about new seller registration
        try {
            await AdminNotification.create({
                type: 'seller_registration',
                title: 'New Seller Registration',
                message: `${businessName} (${ownerName}) has registered and is awaiting verification. Review their documents to approve or reject.`,
                referenceId: seller._id,
                referenceModel: 'Seller',
                actionRequired: true
            });
        } catch (notifErr) {
            console.error('Failed to create admin notification:', notifErr.message);
        }

        // Generate token
        const token = generateToken(seller._id);

        res.status(201).json({
            success: true,
            message: 'Seller registration successful. Please complete verification.',
            data: {
                seller: seller.getPublicProfile(),
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error registering seller',
            error: error.message
        });
    }
};

// Login Seller
const loginSeller = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find seller
        const seller = await Seller.findOne({ email });

        if (!seller) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await seller.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if seller is suspended
        if (seller.isSuspended) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended',
                reason: seller.suspensionReason
            });
        }

        // Check if seller is verified
        if (seller.verificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not verified yet',
                verificationStatus: seller.verificationStatus
            });
        }

        // Update last login
        seller.lastLoginAt = Date.now();
        await seller.save();

        // Generate token
        const token = generateToken(seller._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                seller: seller.getPublicProfile(),
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Get Seller Profile
const getSellerProfile = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id);

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        res.json({
            success: true,
            data: seller.getPublicProfile()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};

// Update Seller Profile
const updateSellerProfile = async (req, res) => {
    try {
        const {
            businessName,
            ownerName,
            phone,
            description,
            website,
            socialMedia,
            preferences
        } = req.body;

        const seller = await Seller.findById(req.seller._id);

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Update fields
        if (businessName) seller.businessName = businessName;
        if (ownerName) seller.ownerName = ownerName;
        if (phone) seller.phone = phone;
        if (description !== undefined) seller.description = description;
        if (website !== undefined) seller.website = website;
        if (socialMedia) seller.socialMedia = { ...seller.socialMedia, ...socialMedia };
        if (preferences) seller.preferences = { ...seller.preferences, ...preferences };

        seller.updatedAt = Date.now();
        await seller.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: seller.getPublicProfile()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

// Upload Verification Documents
const uploadVerificationDocuments = async (req, res) => {
    try {
        const { documents } = req.body; // Array of { type, url }

        const seller = await Seller.findById(req.seller._id);

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Add documents
        documents.forEach(doc => {
            seller.verificationDocuments.push({
                type: doc.type,
                url: doc.url,
                uploadedAt: Date.now()
            });
        });

        seller.updatedAt = Date.now();
        await seller.save();

        res.json({
            success: true,
            message: 'Documents uploaded successfully',
            data: seller.verificationDocuments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading documents',
            error: error.message
        });
    }
};

// Get Seller Dashboard Stats
const getSellerDashboard = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id)
            .populate('stats');

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        const Product = require('../models/Product');
        const Order = require('../models/Order');

        // Get recent orders
        const recentOrders = await Order.find({ 
            'products.creator': seller._id 
        })
        .sort({ createdAt: -1 })
        .limit(10);

        // Get low stock products
        const lowStockProducts = await Product.find({
            creator: seller._id,
            'inventory.stock': { $lt: 10 }
        })
        .select('name inventory.stock')
        .limit(10);

        res.json({
            success: true,
            data: {
                stats: seller.stats,
                rating: {
                    average: seller.averageRating,
                    total: seller.totalReviews
                },
                wallet: seller.wallet,
                recentOrders,
                lowStockProducts,
                verificationStatus: seller.verificationStatus
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard',
            error: error.message
        });
    }
};

module.exports = {
    registerSeller,
    loginSeller,
    getSellerProfile,
    updateSellerProfile,
    uploadVerificationDocuments,
    getSellerDashboard
};
