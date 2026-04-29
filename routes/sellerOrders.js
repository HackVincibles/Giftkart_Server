const express = require('express');
const router = express.Router();
const { getSellerOrders, getSellerOrder, updateOrderStatus } = require('../controllers/sellerOrderController');
const { authenticateSeller } = require('../middleware/auth');

// All routes require seller authentication
router.use(authenticateSeller);

// Get list of orders for seller
router.get('/', getSellerOrders);

// Get details of a specific order
router.get('/:orderId', getSellerOrder);

// Update order status (e.g., shipped, cancelled)
router.put('/:orderId/status', updateOrderStatus);

module.exports = router;
