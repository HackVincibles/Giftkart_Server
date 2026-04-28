const express = require('express');
const router = express.Router();
const { startConversation, getConversationHistory, getUserConversations, endConversation, provideFeedback } = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { aiLimiter } = require('../middleware/rateLimiter');

// Start or continue conversation
router.post('/chat', 
    protect, 
    aiLimiter,
    ...validationRules.chatbotMessage,
    validate,
    startConversation
);

// Get conversation history by session ID
router.get('/session/:sessionId', protect, getConversationHistory);

// Get all user conversations
router.get('/conversations', protect, getUserConversations);

// End conversation
router.post('/session/:sessionId/end', protect, endConversation);

// Provide feedback on conversation
router.post('/session/:sessionId/feedback', protect, provideFeedback);

module.exports = router;
