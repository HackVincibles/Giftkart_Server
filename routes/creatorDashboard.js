const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getOrderQueue,
    updateOrderStatus,
    getOrderAISuggestions,
    getEarnings,
    requestWithdrawal,
    getDemandInsights,
    getPerformance,
    updateAIAssistanceSettings,
    getNotifications,
    markNotificationRead,
    updateLogisticsSettings
} = require('../controllers/creatorDashboardController');
const { protect, authenticateSeller } = require('../middleware/auth');

// Get creator dashboard
router.get('/', protect, authenticateSeller, getDashboard);

// Get order queue
router.get('/orders', protect, authenticateSeller, getOrderQueue);

// Update order status
router.put('/orders/:orderQueueId', protect, authenticateSeller, updateOrderStatus);

// Get AI suggestions for order
router.get('/orders/:orderQueueId/ai-suggestions', protect, authenticateSeller, getOrderAISuggestions);

// Get earnings
router.get('/earnings', protect, authenticateSeller, getEarnings);

// Request withdrawal
router.post('/earnings/withdraw', protect, authenticateSeller, requestWithdrawal);

// Get demand insights
router.get('/insights', protect, authenticateSeller, getDemandInsights);

// Get performance metrics
router.get('/performance', protect, authenticateSeller, getPerformance);

// Update AI assistance settings
router.put('/ai-assistance', protect, authenticateSeller, updateAIAssistanceSettings);

// Get notifications
router.get('/notifications', protect, authenticateSeller, getNotifications);

// Mark notification as read
router.put('/notifications/:notificationId/read', protect, authenticateSeller, markNotificationRead);

// Update logistics settings
router.put('/logistics', protect, authenticateSeller, updateLogisticsSettings);

module.exports = router;
