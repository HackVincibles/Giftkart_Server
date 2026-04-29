const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getAllUsers,
    getAllSellers,
    verifySeller,
    suspendSeller,
    rejectSeller,
    getAllOrders,
    getAllGrievances,
    resolveGrievance,
    getPlatformAnalytics,
    updateSystemSettings,
    getAdminNotifications,
    markNotificationRead,
    getAdminWallet,
    recordCommission,
    updateOrderStatus,
    blockUser,
    unblockUser,
    getAllWithdrawals,
    updateWithdrawalStatus,
    adminWithdrawCommission
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authorization
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.put('/users/:userId/block', blockUser);
router.put('/users/:userId/unblock', unblockUser);

// Sellers
router.get('/sellers', getAllSellers);
router.put('/sellers/:sellerId/verify', verifySeller);
router.put('/sellers/:sellerId/suspend', suspendSeller);
router.put('/sellers/:sellerId/reject', rejectSeller);

// Orders + Transportation Status
router.get('/orders', getAllOrders);
router.put('/orders/:orderId/status', updateOrderStatus);

// Grievances
router.get('/grievances', getAllGrievances);
router.put('/grievances/:grievanceId/resolve', resolveGrievance);

// Analytics
router.get('/analytics', getPlatformAnalytics);

// Settings
router.put('/settings', updateSystemSettings);

// Admin Notifications
router.get('/notifications', getAdminNotifications);
router.put('/notifications/:notificationId/read', markNotificationRead);

// Admin Wallet & Commission
router.get('/wallet', getAdminWallet);
router.post('/wallet/commission', recordCommission);
router.post('/wallet/withdraw', adminWithdrawCommission);

// Withdrawals
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:withdrawalId/status', updateWithdrawalStatus);

module.exports = router;
