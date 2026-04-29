const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini AI Service
 * Wrapper for Google Gemini API for AI features
 */
class GeminiService {
    constructor() {
        // Using gemini-pro for maximum compatibility and stability
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
            console.error('⚠️ Gemini API Error:', error.message);
            // Instead of throwing, return a marker that triggers fallbacks
            return "FALLBACK_REQUIRED";
        }
    }

    /**
     * Analyze person description for gift recommendations
     * @param {string} description - Person description
     * @returns {Promise<Object>} Analysis result with emotions, personality, etc.
     */
    /**
     * Master analysis function to get all data in ONE Gemini call (Faster!)
     */
    async analyzeGiftRequest(message) {
        const prompt = `Analyze this gift request: "${message}"

Return ONLY valid JSON with these fields:
{
  "intent": "gift_suggestion" | "product_search" | "general",
  "summary": "3-word summary",
  "targetGender": "male" | "female" | "neutral",
  "relationship": "brother" | "sister" | "friend" etc,
  "personalityTraits": ["trait1", "trait2"],
  "interests": ["interest1", "interest2"],
  "searchKeywords": ["term1", "term2", "term3"]
}`;

        try {
            const response = await this.generateText(prompt);
            
            if (response === "FALLBACK_REQUIRED") {
                return this.getHardcodedFallback(message);
            }

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return this.getHardcodedFallback(message);
        } catch (error) {
            return this.getHardcodedFallback(message);
        }
    }

    /**
     * Reliable keyword-based fallback when AI fails
     */
    getHardcodedFallback(message) {
        const lower = message.toLowerCase();
        let gender = 'neutral';
        if (lower.includes('brother') || lower.includes('him') || lower.includes('man') || lower.includes('boy')) gender = 'male';
        if (lower.includes('sister') || lower.includes('her') || lower.includes('woman') || lower.includes('girl')) gender = 'female';

        return {
            intent: 'gift_suggestion',
            summary: message,
            targetGender: gender,
            relationship: 'friend',
            personalityTraits: ['practical'],
            interests: [],
            searchKeywords: message.toLowerCase().split(' ').filter(w => w.length >= 3)
        };
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
     * Extract specific product search keywords from user query
     * @param {string} query - User query
     * @returns {Promise<Array>} Array of keywords/categories
     */
    async extractSearchKeywords(query) {
        const prompt = `Extract specific product categories, gift types, or item names from this request: "${query}"

Examples:
- "gift for my sister who likes painting" -> ["painting set", "art supplies", "custom portrait"]
- "something for a cricket fan" -> ["cricket bat", "sports jersey", "cricket kit"]

Return a JSON array of 3-5 specific product keywords. Return only valid JSON array.`;

        try {
            const response = await this.generateText(prompt);
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return query.toLowerCase().split(' ').filter(w => w.length > 3);
        } catch (error) {
            console.error('Error extracting search keywords:', error);
            return query.toLowerCase().split(' ').filter(w => w.length > 3);
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

    /**
     * Generate a human-like summary of the AI results
     * @param {string} query - User's original query
     * @param {Object} analysis - AI's analysis of the person
     * @param {number} productsCount - Number of products found
     * @param {Object} budget - Budget context
     * @returns {Promise<string>} Friendly response message
     */
    async generateHumanizedResponse(query, analysis, productsCount, budget) {
        const prompt = `Act as a friendly, expert gift consultant. Summarize the results of your search.
User query: "${query}"
Analysis: ${JSON.stringify(analysis)}
Products Found: ${productsCount}
Budget Context: ${JSON.stringify(budget)}

Rules:
1. If productsCount > 0: Be excited. Mention that you've found ${productsCount} items. Mention that they match the ${analysis.primaryEmotion} feeling and the ${analysis.personalityTraits.join(', ')} personality traits perfectly.
2. If productsCount == 0: Be empathetic. Explain that while you couldn't find an exact match for "${query}" right now, you've shown some of our top-rated trending items that might still inspire them. Suggest they try broadening their description or adjusting the budget.
3. If the budget was a constraint, mention if the items fit well within the budget.
4. Keep it under 4 sentences. Be helpful and warm.

Return only the text response.`;

        try {
            const res = await this.generateText(prompt);
            if (res === "FALLBACK_REQUIRED") {
                return productsCount > 0 
                    ? `I've found ${productsCount} personalized gifts for you! Based on your request, I've selected items that perfectly match the recipient's style and interests.`
                    : "I couldn't find an exact match for your description, but I've picked out some of our most popular and versatile gifts that I think you'll love!";
            }
            return res;
        } catch (error) {
            return productsCount > 0 
                ? `I've found ${productsCount} personalized gifts for you! Take a look at the collection I've curated for you below.`
                : "I couldn't find an exact match, but I've suggested some trending alternatives that might work!";
        }
    }
}

module.exports = new GeminiService();
