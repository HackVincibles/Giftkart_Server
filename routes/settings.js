const express = require('express');
const router = express.Router();
const {
    getPolicies,
    getPolicy,
    createGrievance,
    getUserGrievances,
    getGrievanceDetails,
    addGrievanceMessage,
    submitGrievanceFeedback,
    escalateGrievance,
    getSupportInfo
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/policies', getPolicies);
router.get('/policies/:type', getPolicy);
router.get('/support-info', getSupportInfo);

// Protected routes
router.post('/grievances', protect, createGrievance);
router.get('/grievances', protect, getUserGrievances);
router.get('/grievances/:grievanceId', protect, getGrievanceDetails);
router.post('/grievances/:grievanceId/messages', protect, addGrievanceMessage);
router.post('/grievances/:grievanceId/feedback', protect, submitGrievanceFeedback);
router.put('/grievances/:grievanceId/escalate', protect, escalateGrievance);

module.exports = router;
