const Queue = require('bull');
const { logger } = require('./logger');

// Redis connection configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0
};

// Only create queues if Redis is enabled
let emailQueue, orderQueue, autoGiftQueue, notificationQueue;
let queuesEnabled = false;

if (process.env.REDIS_ENABLED === 'true') {
    queuesEnabled = true;
    emailQueue = new Queue('email', { redis: redisConfig });
    orderQueue = new Queue('orders', { redis: redisConfig });
    autoGiftQueue = new Queue('auto-gifts', { redis: redisConfig });
    notificationQueue = new Queue('notifications', { redis: redisConfig });
} else {
    logger.info('Bull queues disabled - running without background job processing');
}

// Queue event listeners
const setupQueueListeners = (queue, queueName) => {
    queue.on('completed', (job, result) => {
        logger.info(`Job completed in ${queueName}`, {
            jobId: job.id,
            type: job.name,
            result
        });
    });

    queue.on('failed', (job, err) => {
        logger.error(`Job failed in ${queueName}`, {
            jobId: job.id,
            type: job.name,
            error: err.message,
            stack: err.stack
        });
    });

    queue.on('stalled', (job) => {
        logger.warn(`Job stalled in ${queueName}`, {
            jobId: job.id,
            type: job.name
        });
    });
};

// Setup listeners for all queues
if (queuesEnabled) {
    setupQueueListeners(emailQueue, 'email');
    setupQueueListeners(orderQueue, 'orders');
    setupQueueListeners(autoGiftQueue, 'auto-gifts');
    setupQueueListeners(notificationQueue, 'notifications');
}

// Email job processor
if (queuesEnabled) {
    emailQueue.process('send-welcome-email', async (job) => {
        const { email, name } = job.data;
        logger.info('Processing welcome email', { email, name });
        // Integrate with email service (SendGrid, AWS SES, etc.)
        // For now, just log
        return { success: true, message: 'Welcome email sent' };
    });

    emailQueue.process('send-order-confirmation', async (job) => {
        const { email, orderId, orderDetails } = job.data;
        logger.info('Processing order confirmation email', { email, orderId });
        // Integrate with email service
        return { success: true, message: 'Order confirmation sent' };
    });

    emailQueue.process('send-password-reset', async (job) => {
        const { email, resetToken } = job.data;
        logger.info('Processing password reset email', { email });
        // Integrate with email service
        return { success: true, message: 'Password reset email sent' };
    });

    // Order job processor
    orderQueue.process('process-payment', async (job) => {
        const { orderId, paymentId } = job.data;
        logger.info('Processing payment', { orderId, paymentId });
        // Payment processing logic
        return { success: true, message: 'Payment processed' };
    });

    orderQueue.process('update-inventory', async (job) => {
        const { orderId, products } = job.data;
        logger.info('Updating inventory', { orderId, productCount: products.length });
        // Inventory update logic
        return { success: true, message: 'Inventory updated' };
    });

    orderQueue.process('create-shipping-label', async (job) => {
        const { orderId } = job.data;
        logger.info('Creating shipping label', { orderId });
        // Shipping label creation logic
        return { success: true, message: 'Shipping label created' };
    });

    // Auto-gift job processor
    autoGiftQueue.process('check-occasions', async function(job) {
        const { date } = job.data;
        logger.info('Checking upcoming occasions', { date });
        // Check for upcoming auto-gift occasions
        return { success: true, message: 'Occasions checked' };
    });

    autoGiftQueue.process('send-gift-suggestions', async function(job) {
        const { autoGiftId } = job.data;
        logger.info('Sending gift suggestions', { autoGiftId });
        // Send AI-powered gift suggestions
        return { success: true, message: 'Gift suggestions sent' };
    });

    autoGiftQueue.process('place-auto-gift-order', async function(job) {
        const { autoGiftId } = job.data;
        logger.info('Placing auto-gift order', { autoGiftId });
        // Place order for auto-gift
        return { success: true, message: 'Auto-gift order placed' };
    });

    // Notification job processor
    notificationQueue.process('send-push-notification', async (job) => {
        const { userId, title, body, data } = job.data;
        logger.info('Sending push notification', { userId, title });
        // Integrate with push notification service (Firebase, OneSignal, etc.)
        return { success: true, message: 'Push notification sent' };
    });

    notificationQueue.process('send-sms', async (job) => {
        const { phone, message } = job.data;
        logger.info('Sending SMS', { phone });
        // Integrate with SMS service (Twilio, etc.)
        return { success: true, message: 'SMS sent' };
    });

    notificationQueue.process('send-whatsapp', async (job) => {
        const { phone, message } = job.data;
        logger.info('Sending WhatsApp message', { phone });
        // Integrate with WhatsApp Business API
        return { success: true, message: 'WhatsApp message sent' };
    });
}

// Helper functions to add jobs
const addEmailJob = (type, data, options = {}) => {
    if (!queuesEnabled) {
        logger.warn('Email queue disabled, job not added', { type });
        return Promise.resolve({ success: false, message: 'Queue disabled' });
    }
    return emailQueue.add(type, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options
    });
};

const addOrderJob = (type, data, options = {}) => {
    if (!queuesEnabled) {
        logger.warn('Order queue disabled, job not added', { type });
        return Promise.resolve({ success: false, message: 'Queue disabled' });
    }
    return orderQueue.add(type, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options
    });
};

const addAutoGiftJob = (type, data, options = {}) => {
    if (!queuesEnabled) {
        logger.warn('Auto-gift queue disabled, job not added', { type });
        return Promise.resolve({ success: false, message: 'Queue disabled' });
    }
    return autoGiftQueue.add(type, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options
    });
};

const addNotificationJob = (type, data, options = {}) => {
    if (!queuesEnabled) {
        logger.warn('Notification queue disabled, job not added', { type });
        return Promise.resolve({ success: false, message: 'Queue disabled' });
    }
    return notificationQueue.add(type, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options
    });
};

// Schedule recurring jobs
const scheduleRecurringJobs = async () => {
    if (!queuesEnabled) {
        logger.warn('Queues disabled, recurring jobs not scheduled');
        return;
    }
    // Check for upcoming auto-gift occasions daily at 9 AM
    await autoGiftQueue.add('check-occasions', { date: new Date() }, {
        repeat: {
            cron: '0 9 * * *' // Every day at 9 AM
        },
        removeOnComplete: 10
    });

    logger.info('Recurring jobs scheduled');
};

// Graceful shutdown
const gracefulShutdown = async () => {
    if (!queuesEnabled) {
        logger.info('Queues disabled, nothing to close');
        return;
    }
    logger.info('Closing queues...');

    await emailQueue.close();
    await orderQueue.close();
    await autoGiftQueue.close();
    await notificationQueue.close();

    logger.info('Queues closed successfully');
};

// Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
    emailQueue,
    orderQueue,
    autoGiftQueue,
    notificationQueue,
    addEmailJob,
    addOrderJob,
    addAutoGiftJob,
    addNotificationJob,
    scheduleRecurringJobs,
    gracefulShutdown
};
