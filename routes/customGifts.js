const express = require('express');
const router = express.Router();
const {
    generateAIMessage,
    requestImageEnhancement,
    checkEnhancementStatus,
    buildCustomGift,
    getCustomizationSuggestions,
    prepareVoiceToMessage,
    getVoiceTranscription,
    generateMemoryScrapbook
} = require('../controllers/customGiftController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

// Generate AI message/poem/caption
router.post('/ai-message', protect, aiLimiter, generateAIMessage);

// Request image enhancement
router.post('/image-enhancement', protect, aiLimiter, requestImageEnhancement);

// Check image enhancement status
router.get('/image-enhancement/:enhancementId', protect, checkEnhancementStatus);

// Build custom gift box
router.post('/build', protect, buildCustomGift);

// Get customization suggestions
router.post('/suggestions', protect, getCustomizationSuggestions);

// Prepare voice to message transcription
router.post('/voice-to-message', protect, aiLimiter, prepareVoiceToMessage);

// Get voice transcription result
router.get('/voice-transcription/:transcriptionId', protect, getVoiceTranscription);

// Generate memory scrapbook
router.post('/scrapbook', protect, aiLimiter, generateMemoryScrapbook);

module.exports = router;
