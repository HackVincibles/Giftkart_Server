const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/errorHandler');
const { logger, logApiRequest, logError } = require('./services/logger');
const { scheduleRecurringJobs } = require('./services/queue');
const { closeRedis } = require('./services/redis');
const { initializeSocket } = require('./services/socket');

const app = express();

// DB Connection - Only connect if not in test mode
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('MongoDB Connected');
            console.log('Database Name:', mongoose.connection.name);
        })
        .catch(err => console.error('MongoDB connection error:', err));
}

// Security middleware
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());

// CORS
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // In development, be more permissive to handle multiple local ports
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        return callback(new Error('CORS blocked'), false);
    },
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());

// Logging middleware
app.use(logApiRequest);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/seller-auth', require('./routes/sellerAuth'));
app.use('/api/seller-products', require('./routes/sellerProducts'));
app.use('/api/seller-orders', require('./routes/sellerOrders'));
app.use('/api/seller-analytics', require('./routes/sellerAnalytics'));
app.use('/api/seller-ai', require('./routes/sellerAi'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/order-tracking', require('./routes/orderTracking'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/auto-gift-calendar', require('./routes/autoGiftCalendar'));
app.use('/api/delivery-schedule', require('./routes/deliverySchedule'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/order-cancellation', require('./routes/orderCancellation'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/occasion-delivery', require('./routes/occasionDelivery'));
app.use('/api/product-preview', require('./routes/productPreview'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/webhooks/n8n', require('./services/n8n_webhooks'));
app.use('/api/ai', require('./routes/ai'));
app.post('/api/ai/direct-test', (req, res) => res.json({ success: true, message: 'Server is receiving requests!' }));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/custom-gifts', require('./routes/customGifts'));
app.use('/api/creator-dashboard', require('./routes/creatorDashboard'));
app.use('/api/auto-gifting', require('./routes/autoGifting'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/public', require('./routes/public'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customizations', require('./routes/customizations'));
app.use('/api/search', require('./routes/search'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/referral', require('./routes/referral'));

// Error handler middleware (must be after routes)
app.use(logError);
app.use(errorHandler);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (req, res) => {
    res.send('GiftCart API is running (Manual JWT Mode)...');
});

const PORT = process.env.PORT || 5000;

// Export app for testing
module.exports = app;

// Start server and schedule recurring jobs only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);
        logger.info(`Server started on port ${PORT}`);
        
        // Schedule recurring background jobs
        try {
            await scheduleRecurringJobs();
            logger.info('Background jobs scheduled successfully');
        } catch (error) {
            logger.error('Error scheduling background jobs', { error: error.message });
        }
    });

    // Initialize Socket.io
    initializeSocket(server);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        await closeRedis();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully');
        await closeRedis();
        process.exit(0);
    });
}
