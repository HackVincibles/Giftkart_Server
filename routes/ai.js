const express = require('express');
const { getGiftRecommendations, getRecommendationHistory } = require('../controllers/aiRecommendationController');
const { getPersonalizationSuggestion, vibeCode, saveVibeConcept } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/recommendations', protect, getGiftRecommendations);
router.post('/personalization-suggestion', protect, getPersonalizationSuggestion);
router.post('/vibe-code', protect, vibeCode);
router.post('/save-concept', protect, saveVibeConcept);
router.get('/history', protect, getRecommendationHistory);

module.exports = router;
