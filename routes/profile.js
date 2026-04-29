const express = require('express');
const { getProfile, updateProfile, updateRoleData, requestAccountDeletion, confirmAccountDeletion } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/me', protect, getProfile);
router.put('/update', protect, updateProfile);
router.put('/role-data', protect, updateRoleData);

// Account Deletion
router.post('/delete-request', protect, requestAccountDeletion);
router.post('/delete-confirm', protect, confirmAccountDeletion);

module.exports = router;
