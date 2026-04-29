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
    updateLogisticsSettings,
    addTrackingInfo
} = require('../controllers/creatorDashboardController');
const { protect, authenticateSeller } = require('../middleware/auth');

// Get creator dashboard
router.get('/', protect, authenticateSeller, getDashboard);

// Get order queue
router.get('/orders', protect, authenticateSeller, getOrderQueue);

// Update order status
router.put('/orders/:orderQueueId', protect, authenticateSeller, updateOrderStatus);

// Add tracking info to order
router.put('/orders/:orderQueueId/tracking', protect, authenticateSeller, addTrackingInfo);

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
        const timestamp = new Date().toISOString();
        const prompt = `You are an expert artisanal product consultant for an Indian handcrafted gift marketplace.
Generate 4 unique, trending product ideas for a creator/seller right now in India (Current Time: ${timestamp}). 
IMPORTANT: These should be specific to the current season and upcoming Indian festivals. 
Make sure these ideas are different from common ones and highly creative.

Return ONLY a valid JSON array with exactly 4 objects, each with:
- "title": specific, creative product name
- "reason": one sentence explaining the market demand
- "category": one of ["semi-custom", "fully-custom", "standard"]
- "suggestedPrice": a number between 300 and 5000 (INR)
- "plan": an array of 3-4 specific steps to create and launch this product

Return only valid JSON array, no extra text.`;

        const raw = await geminiService.generateText(prompt);
        
        let ideas = [];
        if (raw !== 'FALLBACK_REQUIRED') {
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
                try { 
                    ideas = JSON.parse(match[0]); 
                    // Verify if it's an array and has at least 1 item
                    if (!Array.isArray(ideas)) ideas = [];
                } catch(e) {
                    console.error("JSON Parse Error in AI Ideas:", e);
                }
            }
        }

        // Fallback ideas if Gemini fails - ensure they have 'plan' too
        if (!ideas || ideas.length === 0) {
            ideas = [
                { 
                    title: "Personalized Resin Name Plates with LED", 
                    reason: "High demand for home decor personalization during housewarming season.", 
                    category: "semi-custom", 
                    suggestedPrice: 1200,
                    plan: ["Design digital layout with client name", "Cast in high-quality UV resin with embedded LED strips", "Finish with weather-proof coating for outdoor use"]
                },
                { 
                    title: "Custom Birth Flower Pressed Art Frame", 
                    reason: "Trending on social media as a unique birthday gift alternative.", 
                    category: "fully-custom", 
                    suggestedPrice: 850,
                    plan: ["Source seasonal flowers based on birth month", "Carefully press and dry for 7-10 days", "Arrange in a minimalist oak wood frame with custom calligraphy"]
                },
                { 
                    title: "Hand-Embroidered Couple Passport Holders", 
                    reason: "Wedding gifting season drives demand for matching accessories.", 
                    category: "semi-custom", 
                    suggestedPrice: 1500,
                    plan: ["Source premium vegan leather holders", "Sketch couple initials or wedding dates", "Embroider using silk threads with traditional Zardosi techniques"]
                },
                { 
                    title: "Miniature Handcrafted Ganesha Idol Set", 
                    reason: "Festival season ahead — Ganesh Chaturthi gifts are in high demand.", 
                    category: "standard", 
                    suggestedPrice: 2200,
                    plan: ["Sculpt master mold in eco-friendly clay", "Hand-paint with non-toxic traditional colors", "Package in sustainable bamboo gift boxes"]
                }
            ];
        }

        res.json({ success: true, data: { ideas } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate ideas', error: error.message });
    }
});

module.exports = router;
