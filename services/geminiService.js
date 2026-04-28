const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini AI Service
 * Wrapper for Google Gemini API for AI features
 */
class GeminiService {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    /**
     * Generate text using Gemini
     * @param {string} prompt - The prompt to send to Gemini
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generateText(prompt, options = {}) {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Analyze person description for gift recommendations
     * @param {string} description - Person description
     * @returns {Promise<Object>} Analysis result with emotions, personality, etc.
     */
    async analyzePersonDescription(description) {
        const prompt = `Analyze this person description for gift recommendations: "${description}"

Provide a JSON response with:
- primaryEmotion: main emotion (love, joy, gratitude, nostalgia, admiration, sympathy, excitement, pride)
- secondaryEmotions: array of other emotions detected
- personalityTraits: array of personality traits (creative, practical, sentimental, adventurous, tech-savvy, foodie, minimalist, luxury-oriented)
- confidence: number between 0 and 1
- interests: array of interests mentioned

Return only valid JSON.`;

        try {
            const response = await this.generateText(prompt);
            // Clean the response to extract JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    primaryEmotion: parsed.primaryEmotion || 'joy',
                    secondaryEmotions: parsed.secondaryEmotions || [],
                    personalityTraits: parsed.personalityTraits || ['practical'],
                    confidence: parsed.confidence || 0.7,
                    interests: parsed.interests || []
                };
            }
            // Fallback if JSON parsing fails
            return {
                primaryEmotion: 'joy',
                secondaryEmotions: [],
                personalityTraits: ['practical'],
                confidence: 0.7,
                interests: []
            };
        } catch (error) {
            console.error('Error analyzing person description:', error);
            // Fallback to basic analysis
            return {
                primaryEmotion: 'joy',
                secondaryEmotions: [],
                personalityTraits: ['practical'],
                confidence: 0.7,
                interests: []
            };
        }
    }

    /**
     * Generate gift suggestions based on emotion
     * @param {string} emotion - Emotion type
     * @param {Object} context - Additional context
     * @returns {Promise<Array>} Gift suggestions
     */
    async generateEmotionBasedSuggestions(emotion, context = {}) {
        const prompt = `Generate gift suggestions for the emotion: "${emotion}"
Context: ${JSON.stringify(context)}

Provide a JSON array of suggestions with:
- category: gift category
- subcategories: array of subcategories
- reasoning: why this matches the emotion

Return only valid JSON array.`;

        try {
            const response = await this.generateText(prompt);
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (error) {
            console.error('Error generating emotion suggestions:', error);
            return [];
        }
    }

    /**
     * Analyze personality and find twin match
     * @param {string} description - Person description
     * @returns {Promise<Object>} Personality analysis
     */
    async analyzePersonality(description) {
        const prompt = `Analyze this personality description: "${description}"

Provide a JSON response with:
- primaryTrait: main personality trait
- secondaryTraits: array of other traits
- giftPreferences: array of gift categories they would like
- communicationStyle: how they communicate
- giftReceptionStyle: how they receive gifts
- similarityScore: number between 0 and 1

Return only valid JSON.`;

        try {
            const response = await this.generateText(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                primaryTrait: 'practical',
                secondaryTraits: [],
                giftPreferences: [],
                communicationStyle: 'direct',
                giftReceptionStyle: 'appreciates utility',
                similarityScore: 0.7
            };
        } catch (error) {
            console.error('Error analyzing personality:', error);
            return {
                primaryTrait: 'practical',
                secondaryTraits: [],
                giftPreferences: [],
                communicationStyle: 'direct',
                giftReceptionStyle: 'appreciates utility',
                similarityScore: 0.7
            };
        }
    }

    /**
     * Generate personalized message
     * @param {Object} params - Message parameters
     * @returns {Promise<Object>} Generated message
     */
    async generateMessage(params) {
        const { recipientName, relationship, occasion, tone, interests, messageType = 'message' } = params;

        const prompt = `Generate a ${messageType} for a gift with these details:
- Recipient: ${recipientName}
- Relationship: ${relationship}
- Occasion: ${occasion}
- Tone: ${tone}
- Interests: ${interests?.join(', ') || 'not specified'}

Make it heartfelt and appropriate for the occasion. Keep it under 200 words for messages, 15 lines for poems, 2 sentences for captions, and 300 words for stories.`;

        try {
            const response = await this.generateText(prompt);
            return {
                original: `Gift for ${recipientName} on ${occasion}`,
                generated: response,
                tone,
                style: messageType,
                wordCount: response.split(' ').length,
                characterCount: response.length
            };
        } catch (error) {
            console.error('Error generating message:', error);
            throw error;
        }
    }

    /**
     * Detect intent from user message
     * @param {string} message - User message
     * @returns {Promise<string>} Detected intent
     */
    async detectIntent(message) {
        const prompt = `Detect the intent of this user message for a gift shop chatbot: "${message}"

Possible intents: gift_suggestion, product_search, order_status, customization, pricing, occasion, help, auto_gifting, creator, general

Return only the intent name as a single word.`;

        try {
            const response = await this.generateText(prompt);
            const intent = response.trim().toLowerCase();
            const validIntents = ['gift_suggestion', 'product_search', 'order_status', 'customization', 'pricing', 'occasion', 'help', 'auto_gifting', 'creator', 'general'];
            return validIntents.includes(intent) ? intent : 'general';
        } catch (error) {
            console.error('Error detecting intent:', error);
            return 'general';
        }
    }

    /**
     * Extract entities from message
     * @param {string} message - User message
     * @returns {Promise<Array>} Extracted entities
     */
    async extractEntities(message) {
        const prompt = `Extract entities from this message: "${message}"

Look for: budget (number), relationship (partner, parent, friend, sibling, colleague, teacher, child), occasion (birthday, anniversary, wedding, diwali, christmas, valentine), emotion (love, joy, gratitude, etc.)

Provide a JSON array with:
- type: entity type
- value: entity value
- confidence: number between 0 and 1

Return only valid JSON array.`;

        try {
            const response = await this.generateText(prompt);
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch (error) {
            console.error('Error extracting entities:', error);
            return [];
        }
    }

    /**
     * Generate chatbot response
     * @param {string} intent - Detected intent
     * @param {Array} entities - Extracted entities
     * @param {string} message - Original message
     * @returns {Promise<Object>} Response with content and suggested actions
     */
    async generateChatbotResponse(intent, entities, message) {
        const prompt = `Generate a helpful chatbot response for a gift shop.
Intent: ${intent}
Entities: ${JSON.stringify(entities)}
User message: "${message}"

Provide a JSON response with:
- content: the response message
- suggestedActions: array of 3-4 suggested actions (e.g., "Find Perfect Gift", "Browse Products")
- productReferences: array of product types to suggest (empty if not applicable)

Keep the response friendly, helpful, and under 3 sentences. Return only valid JSON.`;

        try {
            const response = await this.generateText(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                content: "I'm here to help you find the perfect gift. What would you like to do?",
                suggestedActions: ['Find Perfect Gift', 'Browse Products', 'Talk to Support'],
                productReferences: []
            };
        } catch (error) {
            console.error('Error generating chatbot response:', error);
            return {
                content: "I'm here to help you find the perfect gift. What would you like to do?",
                suggestedActions: ['Find Perfect Gift', 'Browse Products', 'Talk to Support'],
                productReferences: []
            };
        }
    }

    /**
     * Calculate gift success score using AI
     * @param {Object} product - Product details
     * @param {Object} context - User context
     * @param {Object} analysis - AI analysis
     * @returns {Promise<Object>} Score breakdown
     */
    async calculateGiftSuccessScore(product, context, analysis) {
        const prompt = `Calculate a gift success score for this product:
Product: ${JSON.stringify(product)}
Context: ${JSON.stringify(context)}
Analysis: ${JSON.stringify(analysis)}

Provide a JSON response with:
- overall: number between 0 and 1
- emotionalImpact: number between 0 and 1
- practicality: number between 0 and 1
- uniqueness: number between 0 and 1
- budgetFit: number between 0 and 1
- relationshipFit: number between 0 and 1
- occasionFit: number between 0 and 1
- quality: number between 0 and 1
- socialProof: number between 0 and 1
- rating: one of "Excellent Match", "Great Match", "Good Match", "Fair Match", "Average Match", "Poor Match"

Return only valid JSON.`;

        try {
            const response = await this.generateText(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback scoring
            return {
                overall: 0.7,
                emotionalImpact: 0.7,
                practicality: 0.7,
                uniqueness: 0.6,
                budgetFit: 0.7,
                relationshipFit: 0.7,
                occasionFit: 0.7,
                quality: 0.7,
                socialProof: 0.5,
                rating: 'Good Match'
            };
        } catch (error) {
            console.error('Error calculating gift success score:', error);
            return {
                overall: 0.7,
                emotionalImpact: 0.7,
                practicality: 0.7,
                uniqueness: 0.6,
                budgetFit: 0.7,
                relationshipFit: 0.7,
                occasionFit: 0.7,
                quality: 0.7,
                socialProof: 0.5,
                rating: 'Good Match'
            };
        }
    }
}

module.exports = new GeminiService();
