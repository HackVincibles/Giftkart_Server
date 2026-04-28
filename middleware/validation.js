const { body, param, query, validationResult } = require('express-validator');

// Validation middleware handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Common validation rules
const validationRules = {
    // User registration
    register: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        body('displayName')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Display name must be between 2 and 50 characters'),
        body('role')
            .optional()
            .isIn(['buyer', 'creator'])
            .withMessage('Role must be either buyer or creator')
    ],

    // User login
    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email'),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],

    // Product creation
    createProduct: [
        body('name')
            .trim()
            .isLength({ min: 3, max: 100 })
            .withMessage('Product name must be between 3 and 100 characters'),
        body('description')
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('Description must be between 10 and 1000 characters'),
        body('category')
            .isIn(['semi-custom', 'fully-custom', 'standard', 'ai-generated'])
            .withMessage('Invalid product category'),
        body('basePrice')
            .isFloat({ min: 0 })
            .withMessage('Base price must be a positive number'),
        body('customizableFields')
            .optional()
            .isArray()
            .withMessage('Customizable fields must be an array')
    ],

    // AI recommendation query
    giftQuery: [
        body('query')
            .trim()
            .isLength({ min: 3, max: 500 })
            .withMessage('Query must be between 3 and 500 characters'),
        body('queryType')
            .isIn(['person-description', 'occasion-based', 'emotion-based', 'budget-constrained', 'general'])
            .withMessage('Invalid query type'),
        body('context.budget.min')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Minimum budget must be a positive number'),
        body('context.budget.max')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Maximum budget must be a positive number')
    ],

    // Customization
    customization: [
        body('orderId')
            .isMongoId()
            .withMessage('Invalid order ID'),
        body('productId')
            .isMongoId()
            .withMessage('Invalid product ID'),
        body('customizationType')
            .isIn(['photo-upload', 'text-engraving', 'color-change', 'size-adjustment', 'message-addition', 'full-custom'])
            .withMessage('Invalid customization type')
    ],

    // Auto-gifting
    autoGifting: [
        body('recipient.name')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Recipient name must be between 2 and 50 characters'),
        body('recipient.relationship')
            .trim()
            .notEmpty()
            .withMessage('Relationship is required'),
        body('occasion.type')
            .isIn(['birthday', 'anniversary', 'festival', 'achievement', 'random-act', 'custom'])
            .withMessage('Invalid occasion type'),
        body('occasion.date')
            .isISO8601()
            .withMessage('Invalid date format')
    ],

    // Chatbot message
    chatbotMessage: [
        body('message')
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage('Message must be between 1 and 1000 characters'),
        body('sessionId')
            .optional()
            .isString()
            .withMessage('Session ID must be a string')
    ],

    // Order creation
    createOrder: [
        body('products')
            .isArray({ min: 1 })
            .withMessage('At least one product is required'),
        body('products.*.productId')
            .isMongoId()
            .withMessage('Invalid product ID'),
        body('products.*.quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
        body('shippingAddress')
            .notEmpty()
            .withMessage('Shipping address is required')
    ],

    // Payment
    payment: [
        body('amount')
            .isFloat({ min: 1 })
            .withMessage('Amount must be at least 1'),
        body('currency')
            .optional()
            .isIn(['INR', 'USD'])
            .withMessage('Currency must be INR or USD')
    ],

    // MongoDB ID validation
    mongoId: (paramName) => [
        param(paramName)
            .isMongoId()
            .withMessage(`Invalid ${paramName} format`)
    ]
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Remove potentially dangerous characters
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }
    next();
};

// Rate limiting configuration
const rateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
};

module.exports = {
    validate,
    validationRules,
    sanitizeInput,
    rateLimitConfig
};
