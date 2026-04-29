const express = require('express');
const router = express.Router();
const { generateSellerAssistantResponse, generateProductIdeas } = require('../controllers/sellerAiController');
const { authenticateSeller } = require('../middleware/auth');

router.use(authenticateSeller);

router.post('/chat', generateSellerAssistantResponse);
router.get('/ideas', generateProductIdeas);

module.exports = router;
