const express = require('express');
const router = express.Router();
const {
    createNotification,
    getUserNotifications,
    getSellerNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    updateNotificationPreferences
} = require('../controllers/notificationController');
const { protect, authenticateSeller, authorize } = require('../middleware/auth');

// User routes
router.get('/user', protect, getUserNotifications);
router.get('/user/unread-count', protect, getUnreadCount);
router.put('/user/mark-read/:notificationId', protect, markAsRead);
router.put('/user/mark-all-read', protect, markAllAsRead);
router.delete('/user/:notificationId', protect, deleteNotification);
router.put('/user/preferences', protect, updateNotificationPreferences);

// Seller routes
router.get('/seller', authenticateSeller, getSellerNotifications);
router.get('/seller/unread-count', authenticateSeller, getUnreadCount);
router.put('/seller/mark-read/:notificationId', authenticateSeller, markAsRead);
router.put('/seller/mark-all-read', authenticateSeller, markAllAsRead);
router.delete('/seller/:notificationId', authenticateSeller, deleteNotification);
router.put('/seller/preferences', authenticateSeller, updateNotificationPreferences);

// Admin route
router.post('/', protect, authorize('admin'), createNotification);

module.exports = router;
