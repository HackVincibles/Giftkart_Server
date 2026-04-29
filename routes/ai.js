const express = require('express');
const { getGiftRecommendations, getRecommendationHistory } = require('../controllers/aiRecommendationController');
const { getPersonalizationSuggestion } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/recommendations', protect, getGiftRecommendations);
router.post('/personalization-suggestion', protect, getPersonalizationSuggestion);
router.get('/history', protect, getRecommendationHistory);

module.exports = router;
