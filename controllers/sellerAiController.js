const Product = require('../models/Product');
const Order = require('../models/Order');

// Mock AI responder based on prompt keywords
const generateSellerAssistantResponse = async (req, res) => {
    try {
        const { message } = req.body;
        const sellerId = req.seller._id;
        
        let responseText = "I'm here to help! I can write product descriptions, analyze your sales, or suggest pricing strategies.";
        const lowerMessage = message.toLowerCase();

        // 1. Description generation
        if (lowerMessage.includes('description') || lowerMessage.includes('write')) {
            responseText = `**Here is an optimized product description:**\n\n*Crafted with precision and designed to capture memories, this piece is the perfect blend of elegance and personal touch. Each item is made to order, ensuring a unique finish that speaks directly to the heart. Ideal for anniversaries, birthdays, or just because.*\n\n**Suggested SEO Tags:** #Handcrafted #PersonalizedGift #UniqueArt`;
        } 
        // 2. Sales analysis
        else if (lowerMessage.includes('analyze') || lowerMessage.includes('sales')) {
            // Fetch some basic stats for realism
            const products = await Product.find({ creator: sellerId });
            responseText = `Based on my analysis of your ${products.length} active products, your most popular category is **Custom Stationery**. To increase conversions by ~15%, consider bundling your top-selling items with premium gift wrapping during the upcoming holiday season.`;
        }
        // 3. Pricing strategy
        else if (lowerMessage.includes('price') || lowerMessage.includes('pricing')) {
            responseText = `**Pricing Insight:** Products in your niche priced between ₹800 and ₹1,499 see the fastest checkout rates. For your new premium items, a base price of ₹1,299 with a ₹300 optional customization fee yields the best profit margins while remaining competitive.`;
        }
        // 4. Marketing ideas
        else if (lowerMessage.includes('marketing') || lowerMessage.includes('promote')) {
            responseText = `**Marketing Suggestion:**\n1. Run an Instagram Reel showing your creation process with trending audio.\n2. Offer a "Buy 2 Get 10% Off" discount targeting wedding season shoppers.\n3. Update your product images to include a lifestyle background.`;
        }

        // Simulate AI thinking delay
        setTimeout(() => {
            res.json({
                success: true,
                data: {
                    reply: responseText
                }
            });
        }, 1500);

    } catch (error) {
        console.error('Seller AI Error:', error);
        res.status(500).json({ success: false, message: 'AI processing failed.' });
    }
};

const generateProductIdeas = async (req, res) => {
    try {
        const ideaPool = [
            { title: "Personalized Resin Name Plates with LED", reason: "High demand for home decor personalization during housewarming season.", category: "semi-custom", suggestedPrice: 1200 },
            { title: "Custom Birth Flower Pressed Art Frame", reason: "Trending on social media as a unique birthday gift alternative.", category: "fully-custom", suggestedPrice: 850 },
            { title: "Hand-Embroidered Couple Passport Holders", reason: "Wedding gifting season drives demand for matching accessories.", category: "semi-custom", suggestedPrice: 1500 },
            { title: "Miniature Handcrafted Ganesha Idol Set", reason: "Festival season — Ganesh Chaturthi gifts are in high demand.", category: "standard", suggestedPrice: 2200 },
            { title: "Engraved Wooden Recipe Book", reason: "Mother's Day trending item for preserving family culinary secrets.", category: "fully-custom", suggestedPrice: 1800 },
            { title: "Custom Pet Portrait Coffee Mug", reason: "Pet owners consistently show high engagement with personalized daily-use items.", category: "semi-custom", suggestedPrice: 650 },
            { title: "Minimalist Infinity Couple Bracelets", reason: "Valentine's and anniversary evergreen bestseller with low material costs.", category: "standard", suggestedPrice: 499 },
            { title: "Vintage Star Map Poster", reason: "Customers love gifting the exact night sky map of their special dates.", category: "fully-custom", suggestedPrice: 999 },
            { title: "Hand-Poured Scented Soy Candles", reason: "Self-care and gifting staples. 'Lavender Vanilla' is currently the top search.", category: "standard", suggestedPrice: 599 },
            { title: "Custom Neon Sign for Bedroom", reason: "Extremely viral on TikTok/Instagram for room makeovers.", category: "fully-custom", suggestedPrice: 3500 }
        ];

        // Shuffle and pick 4 random ideas
        const shuffled = ideaPool.sort(() => 0.5 - Math.random());
        const selectedIdeas = shuffled.slice(0, 4);

        setTimeout(() => {
            res.json({
                success: true,
                data: {
                    ideas: selectedIdeas
                }
            });
        }, 1000); // Simulate API latency
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate ideas.' });
    }
};

module.exports = {
    generateSellerAssistantResponse,
    generateProductIdeas
};
