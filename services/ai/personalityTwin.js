/**
 * AI Personality Twin Service
 * Simulates personality matching for gift recommendations
 * Now uses Gemini API for real AI analysis
 */

const geminiService = require('../geminiService');

class PersonalityTwin {
    /**
     * Analyze personality traits from description
     * @param {string} description - Person description
     * @returns {Promise<Object>} Personality profile
     */
    async analyzePersonality(description) {
        try {
            // Use Gemini for real AI analysis
            return await geminiService.analyzePersonality(description);
        } catch (error) {
            console.error('Gemini personality analysis failed, using fallback:', error);
            // Fallback to rule-based analysis
            return this.fallbackAnalysis(description);
        }
    }

    /**
     * Fallback rule-based analysis
     */
    fallbackAnalysis(description) {
        const personalityTraits = {
            creative: {
                keywords: ['creative', 'artistic', 'design', 'paint', 'draw', 'craft', 'art', 'imagine', 'innovative'],
                giftPreferences: ['art-supplies', 'custom-design', 'diy-kits', 'creative-tools', 'sketchbooks', 'paint-sets'],
                communicationStyle: 'expressive and visual',
                giftReception: 'appreciates personalization and thoughtfulness'
            },
            practical: {
                keywords: ['practical', 'useful', 'functional', 'organized', 'efficient', 'logical', 'organized', 'planner'],
                giftPreferences: ['useful-gadgets', 'organizers', 'everyday-items', 'functional-gifts', 'tools', 'storage'],
                communicationStyle: 'direct and clear',
                giftReception: 'values utility and efficiency'
            },
            sentimental: {
                keywords: ['sentimental', 'emotional', 'memories', 'feelings', 'heart', 'cherish', 'nostalgic', 'emotional'],
                giftPreferences: ['memory-gifts', 'personalized-items', 'photo-gifts', 'emotional-items', 'keepsakes'],
                communicationStyle: 'warm and heartfelt',
                giftReception: 'deeply moved by meaningful gestures'
            },
            adventurous: {
                keywords: ['adventure', 'travel', 'explore', 'outdoor', 'active', 'hiking', 'traveling', 'explore'],
                giftPreferences: ['experience-gifts', 'travel-items', 'outdoor-gear', 'adventure-kits', 'travel-accessories'],
                communicationStyle: 'enthusiastic and spontaneous',
                giftReception: 'loves new experiences and challenges'
            },
            'tech-savvy': {
                keywords: ['tech', 'gadget', 'digital', 'smart', 'computer', 'electronics', 'programming', 'software'],
                giftPreferences: ['smart-devices', 'tech-accessories', 'gadgets', 'electronics', 'tech-toys'],
                communicationStyle: 'precise and technical',
                giftReception: 'appreciates innovation and cutting-edge tech'
            },
            foodie: {
                keywords: ['food', 'cooking', 'chef', 'culinary', 'gourmet', 'kitchen', 'baking', 'recipes'],
                giftPreferences: ['gourmet-baskets', 'kitchen-gadgets', 'food-experiences', 'culinary-items', 'cookbooks'],
                communicationStyle: 'descriptive and sensory',
                giftReception: 'loves culinary experiences and quality food'
            },
            minimalist: {
                keywords: ['simple', 'minimal', 'clean', 'essential', 'basic', 'declutter', 'simple', 'organized'],
                giftPreferences: ['simple-elegant', 'essential-items', 'quality-basics', 'minimal-design', 'functional'],
                communicationStyle: 'concise and straightforward',
                giftReception: 'prefers quality over quantity'
            },
            'luxury-oriented': {
                keywords: ['luxury', 'premium', 'exclusive', 'high-end', 'quality', 'expensive', 'designer', 'premium'],
                giftPreferences: ['premium-brands', 'exclusive-items', 'luxury-experiences', 'high-end', 'designer'],
                communicationStyle: 'sophisticated and refined',
                giftReception: 'values exclusivity and premium quality'
            }
        };

        const lowerDesc = description.toLowerCase();
        const detectedTraits = [];
        const traitScores = {};

        // Detect personality traits
        Object.entries(personalityTraits).forEach(([trait, data]) => {
            const matches = data.keywords.filter(keyword => lowerDesc.includes(keyword));
            if (matches.length > 0) {
                detectedTraits.push(trait);
                traitScores[trait] = matches.length;
            }
        });

        // Default if no traits detected
        if (detectedTraits.length === 0) {
            detectedTraits.push('practical');
            traitScores.practical = 1;
        }

        // Sort by score
        detectedTraits.sort((a, b) => traitScores[b] - traitScores[a]);

        const primaryTrait = detectedTraits[0];
        const secondaryTraits = detectedTraits.slice(1, 3);

        return {
            primaryTrait,
            secondaryTraits,
            profile: personalityTraits[primaryTrait],
            similarityScore: Math.min(0.6 + (detectedTraits.length * 0.1), 0.95),
            allDetectedTraits: detectedTraits
        };
    }

    /**
     * Find personality twin match
     * @param {string} description - Person description
     * @returns {Promise<Object>} Match result with recommendations
     */
    async findPersonalityTwin(description) {
        const analysis = await this.analyzePersonality(description);
        
        return {
            matchedProfile: analysis.primaryTrait,
            similarityScore: analysis.similarityScore,
            personalityProfile: analysis.profile,
            recommendedGiftCategories: analysis.profile?.giftPreferences || [],
            communicationAdvice: analysis.profile?.communicationStyle || 'direct',
            giftReceptionStyle: analysis.profile?.giftReception || 'appreciates thoughtful gifts',
            secondaryTraits: analysis.secondaryTraits || []
        };
    }
}

module.exports = new PersonalityTwin();
