const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');

module.exports = {
    protectSetup: async (req, res, next) => {
        let token;

        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized to access this route' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'User no longer exists' 
                });
            }

            req.user = user;
            next();
        } catch (err) {
            return res.status(401).json({ 
                success: false,
                message: 'Token is invalid or expired' 
            });
        }
    },

    protect: async (req, res, next) => {
        let token;

        // Check for token in cookies or Authorization header
        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized to access this route' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
            
            // Check in User collection first
            let user = await User.findById(decoded.id).select('-password');
            
            // If not found, check in Seller collection (for manual seller logins)
            if (!user && (decoded.sellerId || decoded.id)) {
                user = await Seller.findById(decoded.sellerId || decoded.id).select('-password');
                if (user) {
                    // Normalize seller object to look like user for middleware purposes
                    user.role = 'seller'; 
                }
            }

            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Account no longer exists' 
                });
            }

            // Check if user is blocked (User model only usually)
            if (user.isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been blocked by the administrator.',
                    blocked: true
                });
            }

            req.user = user;
            next();
        } catch (err) {
            return res.status(401).json({ 
                success: false,
                message: 'Token is invalid or expired' 
            });
        }
    },

    authorize: (...roles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Not authorized' 
                });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ 
                    success: false,
                    message: `User role ${req.user.role} is not authorized to access this route` 
                });
            }
            next();
        };
    },

    // Optional auth - doesn't fail if no token
    optional: async (req, res, next) => {
        let token;

        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
                const user = await User.findById(decoded.id).select('-password');
                if (user) {
                    req.user = user;
                }
            } catch (err) {
                // Continue without user if token is invalid
            }
        }
        next();
    },

    // Verify creator ownership
    verifyCreator: (req, res, next) => {
        if (req.user.role !== 'creator' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Only creators can access this resource' 
            });
        }
        next();
    },

    // Verify buyer ownership
    verifyBuyer: (req, res, next) => {
        if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Only buyers can access this resource' 
            });
        }
        next();
    },

    // Authenticate seller
    authenticateSeller: async (req, res, next) => {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized to access this route' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
            
            let seller;

            // Case 1: Token is a dedicated seller token (decoded.type === 'seller')
            if (decoded.type === 'seller') {
                seller = await Seller.findById(decoded.sellerId).select('-password');
            } 
            // Case 2: Token is a standard user token (decoded.id exists)
            else if (decoded.id) {
                const user = await User.findById(decoded.id);
                if (user && (user.role === 'creator' || user.role === 'admin')) {
                    // Find the seller profile associated with this user's email
                    seller = await Seller.findOne({ email: user.email }).select('-password');
                    
                    // If no seller profile exists yet but they are a creator, auto-create one for development
                    if (!seller && user.role === 'creator') {
                        seller = await Seller.create({
                            businessName: user.displayName + "'s Studio",
                            ownerName: user.displayName,
                            email: user.email,
                            phone: user.phoneNumber || '0000000000',
                            password: 'auto_generated_pass',
                            panNumber: 'ABCDE1234F',
                            businessAddress: {
                                street: 'Auto Created',
                                city: 'Auto Created',
                                state: 'Auto Created',
                                pincode: '000000'
                            },
                            bankDetails: {
                                accountNumber: '0000000000',
                                ifscCode: 'MOCK0000123',
                                bankName: 'Mock Bank',
                                accountHolderName: user.displayName
                            },
                            verificationStatus: 'verified' // Auto-verify
                        });
                    }
                }
            }

            if (!seller) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Not authorized - seller access required. Please register your studio.' 
                });
            }

            // Ensure CreatorDashboard entry exists for this seller
            const CreatorDashboard = require('../models/CreatorDashboard');
            let dashboard = await CreatorDashboard.findOne({ creator: seller._id });
            if (!dashboard) {
                await CreatorDashboard.create({
                    creator: seller._id,
                    earnings: { total: 0, pending: 0, available: 0, withdrawn: 0, monthlyBreakdown: [] },
                    performance: { totalSales: 0, averageRating: 5, completionRate: 100 }
                });
            }

            // Check if seller is verified (Relaxed for development: allow verified or pending)
            if (seller.verificationStatus !== 'verified' && seller.verificationStatus !== 'pending') {
                return res.status(403).json({ 
                    success: false,
                    message: 'Seller account is not verified' 
                });
            }

            // Check if seller is suspended
            if (seller.isSuspended) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Seller account is suspended' 
                });
            }

            req.seller = seller;
            next();
        } catch (err) {
            console.error('Auth Error:', err);
            return res.status(401).json({ 
                success: false,
                message: 'Token is invalid or expired' 
            });
        }
    }
};
