const Notification = require('../models/Notification');
const { addEmailJob, addNotificationJob } = require('../services/queue');
const { logger } = require('../services/logger');

// Create notification
const createNotification = async (req, res) => {
    try {
        const { userId, sellerId, type, title, message, relatedOrder, relatedProduct, relatedGrievance, actionUrl, priority, metadata, channels } = req.body;

        const notification = await Notification.create({
            user: userId,
            seller: sellerId,
            type,
            title,
            message,
            relatedOrder,
            relatedProduct,
            relatedGrievance,
            actionUrl,
            priority,
            metadata,
            channels: channels || { push: { sent: false }, email: { sent: false } }
        });

        // Queue notification jobs based on channels
        if (channels?.email) {
            await addEmailJob('send-notification-email', {
                email: req.body.email,
                notificationId: notification._id,
                title,
                message
            });
        }

        if (channels?.push) {
            await addNotificationJob('send-push-notification', {
                userId,
                title,
                message,
                data: { actionUrl, metadata }
            });
        }

        if (channels?.sms) {
            await addNotificationJob('send-sms', {
                phone: req.body.phone,
                message
            });
        }

        if (channels?.whatsapp) {
            await addNotificationJob('send-whatsapp', {
                phone: req.body.phone,
                message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Notification created',
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating notification',
            error: error.message
        });
    }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        const filter = { user: req.user._id };
        if (unreadOnly === 'true') {
            filter.read = false;
        }

        const notifications = await Notification.find(filter)
            .populate('relatedOrder')
            .populate('relatedProduct')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                unreadCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
};

// Get seller notifications
const getSellerNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        const filter = { seller: req.seller._id };
        if (unreadOnly === 'true') {
            filter.read = false;
        }

        const notifications = await Notification.find(filter)
            .populate('relatedOrder')
            .populate('relatedProduct')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ seller: req.seller._id, read: false });

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                unreadCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Check authorization
        if (notification.user?.toString() !== req.user._id.toString() && 
            notification.seller?.toString() !== req.seller?._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        notification.read = true;
        notification.readAt = Date.now();
        await notification.save();

        res.json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const filter = req.seller ? { seller: req.seller._id, read: false } : { user: req.user._id, read: false };

        await Notification.updateMany(filter, {
            read: true,
            readAt: Date.now()
        });

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error marking all as read',
            error: error.message
        });
    }
};

// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Check authorization
        if (notification.user?.toString() !== req.user._id.toString() && 
            notification.seller?.toString() !== req.seller?._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await notification.deleteOne();

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting notification',
            error: error.message
        });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const filter = req.seller ? { seller: req.seller._id, read: false } : { user: req.user._id, read: false };

        const count = await Notification.countDocuments(filter);

        res.json({
            success: true,
            data: { unreadCount: count }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching unread count',
            error: error.message
        });
    }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
    try {
        const { email, push, sms, whatsapp } = req.body;

        const User = require('../models/User');
        const Seller = require('../models/Seller');

        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, {
                notificationPreferences: {
                    email,
                    push,
                    sms,
                    whatsapp
                }
            });
        } else if (req.seller) {
            await Seller.findByIdAndUpdate(req.seller._id, {
                preferences: {
                    orderNotifications: push,
                    emailNotifications: email,
                    smsNotifications: sms
                }
            });
        }

        res.json({
            success: true,
            message: 'Notification preferences updated'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating preferences',
            error: error.message
        });
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    getSellerNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    updateNotificationPreferences
};
