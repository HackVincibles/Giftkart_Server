const express = require('express');
const router = express.Router();
const { getOrderMessages, sendMessage, getConversations } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, getConversations);
router.get('/:orderId', protect, getOrderMessages);
router.post('/', protect, sendMessage);

module.exports = router;
