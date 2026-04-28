/**
 * AI Gift Mind Reader Service
 * Analyzes person descriptions to extract emotions, personality traits, and gift preferences
 * Now uses Gemini API for real AI analysis
 */

const geminiService = require('../geminiService');

// Emotion mapping for gift suggestions (fallback)
const emotionGiftMap = {
    love: ['jewelry', 'photo-frames', 'custom-art', 'romantic-gifts'],
    joy: ['party-decor', 'fun-gadgets', 'experience-gifts', 'celebration-items'],
    gratitude: ['thank-you-gifts', 'personalized-items', 'handmade-gifts'],
    nostalgia: ['memory-books', 'retro-items', 'photo-collages', 'vintage-gifts'],
    admiration: ['achievement-gifts', 'luxury-items', 'recognition-gifts'],
    sympathy: ['comfort-items', 'soothing-gifts', 'memorial-gifts'],
    excitement: ['surprise-gifts', 'adventure-gifts', 'tech-gadgets'],
    pride: ['achievement-mementos', 'custom-trophies', 'recognition-items']
};

// Personality traits mapping (fallback)
const personalityGiftMap = {
    creative: ['art-supplies', 'custom-design', 'diy-kits', 'creative-tools'],
    practical: ['useful-gadgets', 'organizers', 'everyday-items', 'functional-gifts'],
    sentimental: ['memory-gifts', 'personalized-items', 'photo-gifts', 'emotional-items'],
    adventurous: ['experience-gifts', 'travel-items', 'outdoor-gear', 'adventure-kits'],
    'tech-savvy': ['smart-devices', 'tech-accessories', 'gadgets', 'electronics'],
    foodie: ['gourmet-baskets', 'kitchen-gadgets', 'food-experiences', 'culinary-items'],
    minimalist: ['simple-elegant', 'essential-items', 'quality-basics', 'minimal-design'],
    'luxury-oriented': ['premium-brands', 'exclusive-items', 'luxury-experiences', 'high-end']
};

// Relationship-based gift suggestions (fallback)
const relationshipGiftMap = {
    partner: ['romantic', 'personalized', 'experience', 'memory'],
    parent: ['sentimental', 'practical', 'care-package', 'appreciation'],
    friend: ['fun', 'personalized', 'shared-interests', 'inside-jokes'],
    sibling: ['playful', 'rivalry-themed', 'shared-memories', 'practical'],
    colleague: ['professional', 'appropriate', 'useful', 'neutral'],
    teacher: ['appreciation', 'practical', 'respectful', 'thoughtful'],
    child: ['fun', 'educational', 'age-appropriate', 'engaging']
};

class GiftMindReader {
    /**
     * Analyze person description to extract emotions and personality
     * @param {string} description - Person description text
     * @returns {Promise<Object>} Analysis result with emotions, personality, and confidence
     */
    async analyzePersonDescription(description) {
        try {
            // Use Gemini for real AI analysis
            return await geminiService.analyzePersonDescription(description);
        } catch (error) {
            console.error('Gemini analysis failed, using fallback:', error);
            // Fallback to rule-based analysis
            return this.fallbackAnalysis(description);
        }
    }

    /**
     * Fallback rule-based analysis
     */
    fallbackAnalysis(description) {
        const keywords = {
            emotions: {
                loving: ['love', 'care', 'affection', 'dear', 'beloved', 'cherish'],
                joyful: ['happy', 'cheerful', 'fun', 'excited', 'energetic', 'delighted'],
                grateful: ['thank', 'appreciate', 'grateful', 'thankful', 'blessed'],
                nostalgic: ['memories', 'remember', 'past', 'childhood', 'old days', 'vintage'],
                admiring: ['admire', 'look up to', 'inspire', 'role model', 'respect'],
                sympathetic: ['going through', 'difficult time', 'support', 'comfort', 'sorry'],
                excited: ['thrilled', 'pumped', 'can\'t wait', 'excited', 'eager'],
                proud: ['proud', 'achievement', 'accomplished', 'success', 'proud of']
            },
            personality: {
                creative: ['creative', 'artistic', 'design', 'paint', 'draw', 'craft', 'art', 'imagine', 'innovative'],
                practical: ['practical', 'useful', 'functional', 'organized', 'efficient', 'logical', 'organized', 'planner'],
                sentimental: ['sentimental', 'emotional', 'memories', 'feelings', 'heart', 'cherish', 'nostalgic', 'emotional'],
                adventurous: ['adventure', 'travel', 'explore', 'outdoor', 'active', 'hiking', 'traveling', 'explore'],
                tech: ['tech', 'gadget', 'digital', 'smart', 'computer', 'electronics', 'programming', 'software'],
                food: ['food', 'cooking', 'chef', 'culinary', 'gourmet', 'kitchen', 'baking', 'recipes'],
                minimalist: ['simple', 'minimal', 'clean', 'essential', 'basic', 'declutter', 'simple', 'organized'],
                luxury: ['luxury', 'premium', 'exclusive', 'high-end', 'quality', 'expensive', 'designer', 'premium']
            }
        };

        const lowerDesc = description.toLowerCase();
        const detectedEmotions = [];
        const detectedPersonalities = [];

        // Detect emotions
        Object.entries(keywords.emotions).forEach(([emotion, words]) => {
            const found = words.some(word => lowerDesc.includes(word));
            if (found) detectedEmotions.push(emotion);
        });

        // Detect personality traits
        Object.entries(keywords.personality).forEach(([personality, words]) => {
            const found = words.some(word => lowerDesc.includes(word));
            if (found) detectedPersonalities.push(personality);
        });

        // Default values if nothing detected
        if (detectedEmotions.length === 0) detectedEmotions.push('joy');
        if (detectedPersonalities.length === 0) detectedPersonalities.push('practical');

        return {
            primaryEmotion: detectedEmotions[0],
            secondaryEmotions: detectedEmotions.slice(1),
            personalityTraits: detectedPersonalities,
            confidence: Math.min(0.7 + (detectedEmotions.length + detectedPersonalities.length) * 0.05, 0.95),
            interests: []
        };
    }

    /**
     * Get gift categories based on emotion
     * @param {string} emotion - Emotion type
     * @returns {Array} Gift categories
     */
    getEmotionBasedGifts(emotion) {
        return emotionGiftMap[emotion] || emotionGiftMap.joy;
    }

    /**
     * Get gift categories based on personality
     * @param {string} personality - Personality trait
     * @returns {Array} Gift categories
     */
    getPersonalityBasedGifts(personality) {
        return personalityGiftMap[personality] || personalityGiftMap.practical;
    }

    /**
     * Get gift categories based on relationship
     * @param {string} relationship - Relationship type
     * @returns {Array} Gift categories
     */
    getRelationshipBasedGifts(relationship) {
        return relationshipGiftMap[relationship] || relationshipGiftMap.friend;
    }

    /**
     * Calculate gift success score
     * @param {Object} product - Product object
     * @param {Object} context - User context (budget, occasion, relationship)
     * @param {Object} analysis - AI analysis result
     * @returns {number} Success score between 0 and 1
     */
    calculateGiftSuccessScore(product, context, analysis) {
        let score = 0.5; // Base score

        // Emotion match
        if (product.emotionalContext && product.emotionalContext.some(e => e.emotion === analysis.primaryEmotion)) {
            score += 0.2;
        }

        // Personality match
        if (product.targetAudience && product.targetAudience.some(a => 
            analysis.personalityTraits.some(trait => a.personality?.includes(trait))
        )) {
            score += 0.15;
        }

        // Budget match
        if (context.budget) {
            const price = product.pricing?.base || 0;
            if (price >= (context.budget.min || 0) && price <= (context.budget.max || Infinity)) {
                score += 0.1;
            }
        }

        // Relationship match
        if (context.relationship && product.targetAudience && product.targetAudience.some(a => a.relationship === context.relationship)) {
            score += 0.1;
        }

        // Occasion match
        if (context.occasion && product.emotionalContext && product.emotionalContext.some(e => e.occasions?.includes(context.occasion))) {
            score += 0.1;
        }

        // Quality indicators
        if (product.averageRating) {
            score += (product.averageRating / 5) * 0.15;
        }
        if (product.emotionalImpactAverage) {
            score += (product.emotionalImpactAverage / 5) * 0.1;
        }

        // Popularity boost (social proof)
        if (product.popularity && product.popularity.orders > 10) {
            score += 0.05;
        }

        return Math.min(score, 1.0);
    }
}

module.exports = new GiftMindReader();
