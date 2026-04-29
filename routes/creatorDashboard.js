const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getOrderQueue,
    updateOrderStatus,
    getOrderAISuggestions,
    getEarnings,
    requestWithdrawal,
    getDemandInsights,
    getPerformance,
    updateAIAssistanceSettings,
    getNotifications,
    markNotificationRead,
    updateLogisticsSettings
} = require('../controllers/creatorDashboardController');
const { protect, authenticateSeller } = require('../middleware/auth');

// Get creator dashboard
router.get('/', protect, authenticateSeller, getDashboard);

// Get order queue
router.get('/orders', protect, authenticateSeller, getOrderQueue);

// Update order status
router.put('/orders/:orderQueueId', protect, authenticateSeller, updateOrderStatus);

// Get AI suggestions for order
router.get('/orders/:orderQueueId/ai-suggestions', protect, authenticateSeller, getOrderAISuggestions);

// Get earnings
router.get('/earnings', protect, authenticateSeller, getEarnings);

// Request withdrawal
router.post('/earnings/withdraw', protect, authenticateSeller, requestWithdrawal);

// Get demand insights
router.get('/insights', protect, authenticateSeller, getDemandInsights);

// Get performance metrics
router.get('/performance', protect, authenticateSeller, getPerformance);

// Update AI assistance settings
router.put('/ai-assistance', protect, authenticateSeller, updateAIAssistanceSettings);

// Get notifications
router.get('/notifications', protect, authenticateSeller, getNotifications);

// Mark notification as read
router.put('/notifications/:notificationId/read', protect, authenticateSeller, markNotificationRead);

// Update logistics settings
router.put('/logistics', protect, authenticateSeller, updateLogisticsSettings);

// AI Product Ideas - uses Gemini to generate trending product concepts
router.get('/ai-product-ideas', protect, authenticateSeller, async (req, res) => {
    try {
        const geminiService = require('../services/geminiService');
        const prompt = `You are an expert artisanal product consultant for an Indian handcrafted gift marketplace.
Generate 4 trending product ideas for a creator/seller right now in India.
Return ONLY a valid JSON array with exactly 4 objects, each with:
- "title": specific, creative product name (e.g. "Hand-Painted Madhubani Diyas Set")
- "reason": one sentence explaining the market demand or trending occasion
- "category": one of ["semi-custom", "fully-custom", "standard"]
- "suggestedPrice": a number between 300 and 5000 (INR)

Consider: upcoming Indian festivals, seasons, gifting trends, and personalization demand.
Return only valid JSON array, no extra text.`;

        const raw = await geminiService.generateText(prompt);
        
        let ideas = [];
        if (raw !== 'FALLBACK_REQUIRED') {
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
                try { ideas = JSON.parse(match[0]); } catch(e) {}
            }
        }

        // Fallback ideas if Gemini fails
        if (!ideas || ideas.length === 0) {
            ideas = [
                { title: "Personalized Resin Name Plates with LED", reason: "High demand for home decor personalization during housewarming season.", category: "semi-custom", suggestedPrice: 1200 },
                { title: "Custom Birth Flower Pressed Art Frame", reason: "Trending on social media as a unique birthday gift alternative.", category: "fully-custom", suggestedPrice: 850 },
                { title: "Hand-Embroidered Couple Passport Holders", reason: "Wedding gifting season drives demand for matching accessories.", category: "semi-custom", suggestedPrice: 1500 },
                { title: "Miniature Handcrafted Ganesha Idol Set", reason: "Festival season ahead — Ganesh Chaturthi gifts are in high demand.", category: "standard", suggestedPrice: 2200 }
            ];
        }

        res.json({ success: true, data: { ideas } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate ideas', error: error.message });
    }
});

module.exports = router;
