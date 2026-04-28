const express = require('express');
const router = express.Router();
const {
    registerSeller,
    loginSeller,
    getSellerProfile,
    updateSellerProfile,
    uploadVerificationDocuments,
    getSellerDashboard
} = require('../controllers/sellerAuthController');
const { authenticateSeller } = require('../middleware/auth');

// Public routes
router.post('/register', registerSeller);
router.post('/login', loginSeller);

// Protected routes
router.get('/profile', authenticateSeller, getSellerProfile);
router.put('/profile', authenticateSeller, updateSellerProfile);
router.post('/verification-documents', authenticateSeller, uploadVerificationDocuments);
router.get('/dashboard', authenticateSeller, getSellerDashboard);

module.exports = router;
