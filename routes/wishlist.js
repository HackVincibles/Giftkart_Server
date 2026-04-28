const express = require('express');
const router = express.Router();
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem,
    shareWishlist,
    getPublicWishlist,
    moveToCart
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.delete('/:productId', removeFromWishlist);
router.put('/:productId', updateWishlistItem);
router.put('/share', shareWishlist);
router.post('/:productId/move-to-cart', moveToCart);

// Public route (no auth required)
router.get('/public/:wishlistId', getPublicWishlist);

module.exports = router;
