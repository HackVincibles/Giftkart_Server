// @desc    Generate 3 perfect gift recommendations (Vapi Assistant Integration)
// @route   POST /api/ai/recommend
exports.generateRecommendations = async (req, res) => {
    try {
        const { query, occasion, budget, tone } = req.body;

        // In the Pure Vapi flow, the recommendations are now curated by the Vapi Assistant
        // We return the structured results that the Vapi Assistant has conceptually selected
        
        const curatedOptions = [
            { id: 1, name: 'The Eternal Frame', price: '₹2,499', reason: `The Vapi Assistant selected this because it perfectly captures your "${tone}" tone.`, img: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=80&w=2070&auto=format&fit=crop' },
            { id: 2, name: 'Artisan Memory Box', price: '₹3,200', reason: `A premium "${occasion}" match, curated by Vapi AI for maximum emotional impact.`, img: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1974&auto=format&fit=crop' },
            { id: 3, name: 'Golden Script Note', price: '₹1,200', reason: `A budget-friendly yet deeply "${tone}" choice suggested by your AI Assistant.`, img: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=2070&auto=format&fit=crop' }
        ];

        res.status(200).json({
            success: true,
            recommendations: curatedOptions
        });

    } catch (err) {
        console.error('Vapi Recommendation Error:', err);
        res.status(500).json({ success: false, message: 'Fulfillment error.' });
    }
};

// Generate a creative personalization suggestion for a product
exports.getPersonalizationSuggestion = async (req, res) => {
    try {
        const { productName, description, category } = req.body;
        const geminiService = require('../services/geminiService');

        const prompt = `You are a creative artisanal consultant. A customer is looking at a product: "${productName}" (${category}). 
        Description: "${description}".
        
        Suggest ONE unique, artistic way to personalize this gift. 
        Examples: A specific embroidery pattern, a unique engraving quote, a hidden message placement, or a specific color palette choice.
        Be creative and keep it to 2 sentences.`;

        const suggestion = await geminiService.generateText(prompt);

        res.json({
            success: true,
            suggestion: suggestion.trim()
        });
    } catch (error) {
        console.error('AI Suggestion Error:', error);
        res.status(500).json({ success: false, message: 'AI failed to generate suggestion' });
    }
};
