const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getAllCoupons,
    getActiveCoupons,
    validateCoupon,
    applyCoupon,
    getUserCouponHistory,
    updateCoupon,
    deleteCoupon
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/active', getActiveCoupons);
router.post('/validate', protect, validateCoupon);

// User routes
router.post('/apply', protect, applyCoupon);
router.get('/my-history', protect, getUserCouponHistory);

// Admin routes
router.post('/', protect, authorize('admin'), createCoupon);
router.get('/', protect, authorize('admin'), getAllCoupons);
router.put('/:couponId', protect, authorize('admin'), updateCoupon);
router.delete('/:couponId', protect, authorize('admin'), deleteCoupon);

module.exports = router;
