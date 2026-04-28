const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getAllUsers,
    getAllSellers,
    verifySeller,
    suspendSeller,
    getAllOrders,
    getAllGrievances,
    resolveGrievance,
    getPlatformAnalytics,
    updateSystemSettings
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authorization
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);

// Sellers
router.get('/sellers', getAllSellers);
router.put('/sellers/:sellerId/verify', verifySeller);
router.put('/sellers/:sellerId/suspend', suspendSeller);

// Orders
router.get('/orders', getAllOrders);

// Grievances
router.get('/grievances', getAllGrievances);
router.put('/grievances/:grievanceId/resolve', resolveGrievance);

// Analytics
router.get('/analytics', getPlatformAnalytics);

// Settings
router.put('/settings', updateSystemSettings);

module.exports = router;
