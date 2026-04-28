/**
 * AI Emotion-Based Suggestions Service
 * Provides gift suggestions based on emotional context
 * Now uses Gemini API for real AI suggestions
 */

const geminiService = require('../geminiService');

class EmotionBasedSuggestions {
    /**
     * Generate emotion-based gift suggestions
     * @param {string} emotion - Primary emotion
     * @param {Array} secondaryEmotions - Secondary emotions
     * @param {Object} context - Additional context
     * @returns {Promise<Array>} Suggested gift categories with reasoning
     */
    async generateSuggestions(emotion, secondaryEmotions = [], context = {}) {
        try {
            // Use Gemini for real AI suggestions
            const aiSuggestions = await geminiService.generateEmotionBasedSuggestions(emotion, context);
            
            if (aiSuggestions && aiSuggestions.length > 0) {
                return aiSuggestions.map(s => ({
                    ...s,
                    emotion,
                    priority: 'high',
                    reasoning: s.reasoning || `Based on the ${emotion} emotion detected`
                }));
            }
            
            // Fallback to rule-based suggestions
            return this.fallbackSuggestions(emotion, secondaryEmotions, context);
        } catch (error) {
            console.error('Gemini suggestions failed, using fallback:', error);
            return this.fallbackSuggestions(emotion, secondaryEmotions, context);
        }
    }

    /**
     * Fallback rule-based suggestions
     */
    fallbackSuggestions(emotion, secondaryEmotions = [], context = {}) {
        const suggestions = [];

        // Primary emotion suggestions
        const primarySuggestions = this.getEmotionSuggestions(emotion);
        suggestions.push(...primarySuggestions.map(s => ({
            ...s,
            emotion,
            priority: 'high',
            reasoning: `Based on the ${emotion} emotion detected`
        })));

        // Secondary emotion suggestions
        secondaryEmotions.forEach(secEmotion => {
            const secSuggestions = this.getEmotionSuggestions(secEmotion);
            suggestions.push(...secSuggestions.map(s => ({
                ...s,
                emotion: secEmotion,
                priority: 'medium',
                reasoning: `Also considers ${secEmotion} emotion`
            })));
        });

        // Context-aware adjustments
        if (context.occasion) {
            suggestions.forEach(s => {
                s.context = s.context || {};
                s.context.occasion = context.occasion;
            });
        }

        return suggestions;
    }

    /**
     * Get suggestions for a specific emotion (fallback)
     * @param {string} emotion - Emotion type
     * @returns {Array} Gift suggestions
     */
    getEmotionSuggestions(emotion) {
        const emotionMap = {
            love: [
                { category: 'jewelry', subcategories: ['rings', 'necklaces', 'bracelets'] },
                { category: 'photo-frames', subcategories: ['custom-engraved', 'heart-shaped'] },
                { category: 'custom-art', subcategories: ['portraits', 'couple-art'] },
                { category: 'romantic-gifts', subcategories: ['love-letters', 'memory-books'] }
            ],
            joy: [
                { category: 'party-decor', subcategories: ['balloons', 'banners', 'confetti'] },
                { category: 'fun-gadgets', subcategories: ['novelty-items', 'prank-gifts'] },
                { category: 'experience-gifts', subcategories: ['adventures', 'workshops'] },
                { category: 'celebration-items', subcategories: ['cakes', 'celebration-hampers'] }
            ],
            gratitude: [
                { category: 'thank-you-gifts', subcategories: ['appreciation-plaques', 'thank-you-cards'] },
                { category: 'personalized-items', subcategories: ['engraved-pens', 'custom-mugs'] },
                { category: 'handmade-gifts', subcategories: ['handcrafted-items', 'diy-kits'] }
            ],
            nostalgia: [
                { category: 'memory-books', subcategories: ['scrapbooks', 'photo-albums'] },
                { category: 'retro-items', subcategories: ['vintage-gifts', 'classic-toys'] },
                { category: 'photo-collages', subcategories: ['digital-collages', 'framed-collages'] },
                { category: 'vintage-gifts', subcategories: ['antique-style', 'retro-design'] }
            ],
            admiration: [
                { category: 'achievement-gifts', subcategories: ['trophies', 'awards', 'certificates'] },
                { category: 'luxury-items', subcategories: ['premium-brands', 'exclusive-items'] },
                { category: 'recognition-gifts', subcategories: ['plaques', 'commemorative-items'] }
            ],
            sympathy: [
                { category: 'comfort-items', subcategories: ['blankets', 'soothing-items'] },
                { category: 'soothing-gifts', subcategories: ['aromatherapy', 'relaxation-kits'] },
                { category: 'memorial-gifts', subcategories: ['memory-items', 'commemorative'] }
            ],
            excitement: [
                { category: 'surprise-gifts', subcategories: ['mystery-boxes', 'surprise-packages'] },
                { category: 'adventure-gifts', subcategories: ['experience-vouchers', 'adventure-kits'] },
                { category: 'tech-gadgets', subcategories: ['latest-tech', 'smart-devices'] }
            ],
            pride: [
                { category: 'achievement-mementos', subcategories: ['framed-certificates', 'achievement-displays'] },
                { category: 'custom-trophies', subcategories: ['personalized-trophies', 'awards'] },
                { category: 'recognition-items', subcategories: ['medals', 'badges', 'pins'] }
            ]
        };

        return emotionMap[emotion] || emotionMap.joy;
    }
}

module.exports = new EmotionBasedSuggestions();
