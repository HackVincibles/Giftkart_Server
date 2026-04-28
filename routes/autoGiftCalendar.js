const express = require('express');
const router = express.Router();
const {
    createAutoGift,
    getAutoGiftCalendar,
    getUpcomingAutoGifts,
    getAutoGiftDetails,
    updateAutoGift,
    updateDeliveryAddress,
    getAIGiftSuggestions,
    selectGifts,
    cancelAutoGift,
    getDeliveryEstimation
} = require('../controllers/autoGiftCalendarController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.post('/', createAutoGift);
router.get('/', getAutoGiftCalendar);
router.get('/upcoming', getUpcomingAutoGifts);
router.get('/delivery-estimation', getDeliveryEstimation);
router.get('/:autoGiftId', getAutoGiftDetails);
router.put('/:autoGiftId', updateAutoGift);
router.put('/:autoGiftId/delivery-address', updateDeliveryAddress);
router.get('/:autoGiftId/ai-suggestions', getAIGiftSuggestions);
router.post('/:autoGiftId/select-gifts', selectGifts);
router.put('/:autoGiftId/cancel', cancelAutoGift);

module.exports = router;
