const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    saveForLater,
    moveToCart,
    applyCoupon,
    removeCoupon,
    clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/items/:itemId/quantity', updateItemQuantity);
router.delete('/items/:itemId', removeFromCart);
router.put('/items/:itemId/save-for-later', saveForLater);
router.put('/items/:itemId/move-to-cart', moveToCart);
router.post('/apply-coupon', applyCoupon);
router.delete('/remove-coupon', removeCoupon);
router.delete('/clear', clearCart);

module.exports = router;
