const express = require('express');
const { getGiftRecommendations, getRecommendationHistory } = require('../controllers/aiRecommendationController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/recommendations', protect, getGiftRecommendations);
router.get('/history', protect, getRecommendationHistory);

module.exports = router;
