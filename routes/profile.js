const express = require('express');
const { getProfile, updateProfile, updateRoleData } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/me', protect, getProfile);
router.put('/update', protect, updateProfile);
router.put('/role-data', protect, updateRoleData);

module.exports = router;
