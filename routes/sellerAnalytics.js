const express = require('express');
const router = express.Router();
const { getSellerDashboardAnalytics, getSellerWallet } = require('../controllers/sellerAnalyticsController');
const { authenticateSeller } = require('../middleware/auth');

router.use(authenticateSeller);

router.get('/', getSellerDashboardAnalytics);
router.get('/wallet', getSellerWallet);

module.exports = router;
