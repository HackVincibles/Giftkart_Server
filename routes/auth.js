const express = require('express');
const { register, login, logout, getMe, setRole, getGoogleUrl, googleCallback, googleLoginClient } = require('../controllers/authController');
const { protect, protectSetup } = require('../middleware/auth');
const router = express.Router();

// Local Auth
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// Manual Google Auth
router.get('/google', getGoogleUrl);
router.get('/google/callback', googleCallback);
router.post('/google', googleLoginClient);

// Protected Routes
router.get('/me', protect, getMe);
router.post('/set-role', protectSetup, setRole);

module.exports = router;
