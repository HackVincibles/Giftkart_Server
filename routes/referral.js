const express = require('express');
const router = express.Router();
const { getReferralCode, getReferralStats, verifyReferralCode } = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

router.get('/code', protect, getReferralCode);
router.get('/stats', protect, getReferralStats);
router.post('/verify', protect, verifyReferralCode);

module.exports = router;
