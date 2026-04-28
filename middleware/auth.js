const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');

module.exports = {
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
            
            // Check if user still exists
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'User no longer exists' 
                });
            }

            // Check if user is active
            if (user.role === 'unassigned') {
                return res.status(403).json({ 
                    success: false,
                    message: 'Please complete your profile setup' 
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
            
            // Check if it's a seller token
            if (decoded.type !== 'seller') {
                return res.status(403).json({ 
                    success: false,
                    message: 'Not authorized - seller access required' 
                });
            }

            // Check if seller still exists
            const seller = await Seller.findById(decoded.sellerId).select('-password');
            if (!seller) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Seller no longer exists' 
                });
            }

            // Check if seller is verified
            if (seller.verificationStatus !== 'verified') {
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
            return res.status(401).json({ 
                success: false,
                message: 'Token is invalid or expired' 
            });
        }
    }
};
