const express = require('express');
const router = express.Router();
const { getGiftRecommendations, getRecommendationHistory, provideFeedback } = require('../controllers/aiRecommendationController');
const { protect } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { aiLimiter } = require('../middleware/rateLimiter');

// Get AI gift recommendations
router.post('/recommend', 
    protect, 
    aiLimiter,
    ...validationRules.giftQuery,
    validate,
    getGiftRecommendations
);

// Get recommendation history for user
router.get('/history', protect, getRecommendationHistory);

// Provide feedback on recommendations
router.post('/feedback', protect, provideFeedback);

// Get single recommendation by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const AIRecommendation = require('../models/AIRecommendation');
        const recommendation = await AIRecommendation.findById(req.params.id)
            .populate('recommendations.product')
            .populate('recommendations.creator');

        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: 'Recommendation not found'
            });
        }

        // Check authorization
        if (recommendation.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this recommendation'
            });
        }

        res.json({
            success: true,
            data: recommendation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recommendation',
            error: error.message
        });
    }
});

module.exports = router;
