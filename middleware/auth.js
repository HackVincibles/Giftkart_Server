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

    // Authenticate creator as a seller (Unified Role)
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
            
            const user = await User.findById(decoded.id).select('-password');
            if (!user || (user.role !== 'creator' && user.role !== 'admin')) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Not authorized - creator access required.' 
                });
            }

            // Alias creatorProfile as seller for compatibility with legacy seller controllers
            req.user = user;
            req.seller = user.creatorProfile;
            // Add _id to seller for controllers that use req.seller._id
            if (req.seller) {
                req.seller._id = user._id;
                req.seller.commissionRate = req.seller.commissionRate || 15; // Default commission
            }

            next();
        } catch (err) {
            console.error('Unified Auth Error:', err);
            return res.status(401).json({ 
                success: false,
                message: 'Token is invalid or expired' 
            });
        }
    }
};
