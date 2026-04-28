const express = require('express');
const router = express.Router();
const {
    createAutoGiftingRecipient,
    getAutoGiftingRecipients,
    getAutoGiftingRecipient,
    updateAutoGiftingRecipient,
    deleteAutoGiftingRecipient,
    getUpcomingOccasions,
    scheduleGift,
    getRelationshipInsights,
    updateRelationshipInsights,
    getAutoGiftingSuggestions,
    toggleAutoGifting,
    getScheduledGifts,
    cancelScheduledGift
} = require('../controllers/autoGiftingController');
const { protect } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');

// Create auto-gifting recipient
router.post('/', protect, createAutoGiftingRecipient);

// Get all auto-gifting recipients
router.get('/', protect, getAutoGiftingRecipients);

// Get single auto-gifting recipient
router.get('/:id', protect, getAutoGiftingRecipient);

// Update auto-gifting recipient
router.put('/:id', protect, updateAutoGiftingRecipient);

// Delete auto-gifting recipient
router.delete('/:id', protect, deleteAutoGiftingRecipient);

// Get upcoming occasions
router.get('/occasions/upcoming', protect, getUpcomingOccasions);

// Schedule a gift
router.post('/:id/schedule', protect, scheduleGift);

// Get relationship insights
router.get('/:id/insights', protect, getRelationshipInsights);

// Update relationship insights
router.put('/:id/insights', protect, updateRelationshipInsights);

// Get AI suggestions
router.get('/:id/suggestions', protect, getAutoGiftingSuggestions);

// Toggle auto-gifting
router.put('/:id/toggle', protect, toggleAutoGifting);

// Get scheduled gifts
router.get('/:id/scheduled', protect, getScheduledGifts);

// Cancel scheduled gift
router.delete('/:autoGiftingId/scheduled/:scheduledGiftId', protect, cancelScheduledGift);

module.exports = router;
