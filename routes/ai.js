const express = require('express');
const { generateRecommendations } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/recommend', protect, generateRecommendations);

module.exports = router;
