const express = require('express');
const { createOrder, verifyPayment, getTransactions, requestWithdrawal, getSummary } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/summary', protect, getSummary);
router.get('/transactions', protect, getTransactions);
router.post('/add-money', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.post('/request-withdrawal', protect, requestWithdrawal);

module.exports = router;
