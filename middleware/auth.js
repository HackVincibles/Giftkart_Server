const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = {
    protect: async (req, res, next) => {
        let token;

        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized to access this route' });
        }

        try {
            const decoded = jwt.verify(token, process.env.SESSION_SECRET);
            req.user = await User.findById(decoded.id);
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Not authorized' });
        }
    },

    authorize: (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ 
                    message: `User role ${req.user.role} is not authorized to access this route` 
                });
            }
            next();
        };
    }
};
