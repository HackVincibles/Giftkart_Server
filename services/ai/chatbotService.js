/**
 * AI Chatbot Service (Rufus-like Assistant)
 * Handles intent detection, entity extraction, and response generation
 * Now uses Gemini API for real AI chatbot
 */

const geminiService = require('../geminiService');

class ChatbotService {
    // Intent detection patterns (fallback)
    intentPatterns = {
        gift_suggestion: ['gift', 'suggest', 'recommend', 'what should', 'present', 'gift idea', 'find gift'],
        product_search: ['search', 'find', 'looking for', 'show me', 'product', 'browse'],
        order_status: ['order', 'status', 'where is', 'delivery', 'shipping', 'track'],
        customization: ['customize', 'personalize', 'add photo', 'engrave', 'custom', 'personalized'],
        pricing: ['price', 'cost', 'how much', 'cheap', 'expensive', 'budget', 'affordable'],
        occasion: ['birthday', 'anniversary', 'wedding', 'festival', 'celebration', 'event'],
        help: ['help', 'how to', 'can you', 'assist', 'support', 'guide'],
        auto_gifting: ['auto gift', 'schedule gift', 'automatic', 'reminder', 'upcoming occasion'],
        creator: ['creator', 'seller', 'artisan', 'maker', 'studio']
    };

    /**
     * Detect user intent from message
     * @param {string} message - User message
     * @returns {Promise<string>} Detected intent
     */
    async detectIntent(message) {
        try {
            // Use Gemini for real AI intent detection
            return await geminiService.detectIntent(message);
        } catch (error) {
            console.error('Gemini intent detection failed, using fallback:', error);
            // Fallback to rule-based detection
            return this.fallbackDetectIntent(message);
        }
    }

    /**
     * Fallback intent detection
     */
    fallbackDetectIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns) {
                if (lowerMessage.includes(pattern)) {
                    return intent;
                }
            }
        }
        
        return 'general';
    }

    /**
     * Extract entities from message
     * @param {string} message - User message
     * @returns {Promise<Array>} Extracted entities
     */
    async extractEntities(message) {
        try {
            // Use Gemini for real AI entity extraction
            return await geminiService.extractEntities(message);
        } catch (error) {
            console.error('Gemini entity extraction failed, using fallback:', error);
            // Fallback to rule-based extraction
            return this.fallbackExtractEntities(message);
        }
    }

    /**
     * Fallback entity extraction
     */
    fallbackExtractEntities(message) {
        const entities = [];
        const lowerMessage = message.toLowerCase();
        
        // Extract budget
        const budgetMatch = lowerMessage.match(/(\d+)\s*(rupees?|rs\.?|₹|inr)/i);
        if (budgetMatch) {
            entities.push({
                type: 'budget',
                value: parseInt(budgetMatch[1]),
                confidence: 0.9
            });
        }
        
        // Extract relationship
        const relationships = ['partner', 'husband', 'wife', 'boyfriend', 'girlfriend', 'friend', 'parent', 'mom', 'dad', 'mother', 'father', 'sibling', 'brother', 'sister', 'colleague', 'boss', 'teacher'];
        for (const rel of relationships) {
            if (lowerMessage.includes(rel)) {
                entities.push({
                    type: 'relationship',
                    value: rel,
                    confidence: 0.85
                });
                break;
            }
        }
        
        // Extract occasion
        const occasions = ['birthday', 'anniversary', 'wedding', 'festival', 'celebration', 'event'];
        for (const occ of occasions) {
            if (lowerMessage.includes(occ)) {
                entities.push({
                    type: 'occasion',
                    value: occ,
                    confidence: 0.9
                });
                break;
            }
        }

        // Extract emotion
        const emotions = ['love', 'happy', 'joy', 'grateful', 'nostalgic', 'excited', 'proud'];
        for (const emo of emotions) {
            if (lowerMessage.includes(emo)) {
                entities.push({
                    type: 'emotion',
                    value: emo,
                    confidence: 0.8
                });
                break;
            }
        }
        
        return entities;
    }

    /**
     * Generate response based on intent and context
     * @param {string} intent - Detected intent
     * @param {Array} entities - Extracted entities
     * @param {Object} context - Conversation context
     * @param {string} message - Original message
     * @returns {Promise<Object>} Response with content and suggested actions
     */
    async generateResponse(intent, entities, context, message) {
        try {
            // Use Gemini for real AI response generation
            return await geminiService.generateChatbotResponse(intent, entities, message);
        } catch (error) {
            console.error('Gemini response generation failed, using fallback:', error);
            // Fallback to rule-based response
            return this.fallbackGenerateResponse(intent, entities, context, message);
        }
    }

    /**
     * Fallback response generation
     */
    fallbackGenerateResponse(intent, entities, context, message) {
        let response = '';
        let suggestedActions = [];
        let productReferences = [];
        
        switch (intent) {
            case 'gift_suggestion':
                response = "I'd love to help you find the perfect gift! Could you tell me more about the person you're buying for? For example, their interests, your relationship with them, or the occasion?";
                suggestedActions = ['Use AI Gift Finder', 'Browse by Occasion', 'Browse by Relationship'];
                break;
                
            case 'product_search':
                response = "I can help you search for products. What type of gift are you looking for? You can describe it or tell me the category.";
                suggestedActions = ['Search Products', 'Browse Categories', 'View Featured'];
                break;
                
            case 'order_status':
                response = "To check your order status, please go to your profile and view your orders. Is there a specific order you're looking for?";
                suggestedActions = ['View My Orders', 'Track Order'];
                break;
                
            case 'customization':
                response = "Customization is one of our specialties! We offer photo uploads, text engraving, color changes, and more. What would you like to customize?";
                suggestedActions = ['Create Custom Gift', 'View Customizable Products'];
                break;
                
            case 'pricing':
                response = "Our products range from affordable to premium. What's your budget range? I can help you find the best options within your price.";
                suggestedActions = ['Filter by Price', 'View Budget Options'];
                break;
                
            case 'occasion':
                response = `Great choice! ${entities.find(e => e.type === 'occasion')?.value || 'This occasion'} gifts are special. Would you like me to suggest some gift ideas for this occasion?`;
                suggestedActions = ['Get Gift Suggestions', 'Browse Occasion Gifts'];
                break;
                
            case 'auto_gifting':
                response = "Smart Auto-Gifting can help you never miss an important occasion! You can set up automatic gift reminders and even schedule gifts in advance. Would you like to set this up?";
                suggestedActions = ['Set Up Auto-Gifting', 'View Upcoming Occasions'];
                break;

            case 'creator':
                response = "Our creators are talented artisans who make personalized gifts. Would you like to browse creator profiles or see what they offer?";
                suggestedActions = ['Browse Creators', 'View Creator Products'];
                break;
                
            case 'help':
                response = "I'm here to help! I can assist you with finding gifts, customizing products, checking orders, or answering any questions. What would you like to do?";
                suggestedActions = ['Find Perfect Gift', 'Create Custom Gift', 'Track Order', 'Browse Products'];
                break;
                
            default:
                response = "I understand you're looking for help with gifts. Could you tell me more about what you need? I can help with gift suggestions, product searches, or answer questions about our services.";
                suggestedActions = ['Find Perfect Gift', 'Browse Products', 'Talk to Support'];
        }
        
        return {
            content: response,
            suggestedActions,
            productReferences
        };
    }

    /**
     * Get conversation context summary
     * @param {Object} context - Conversation context
     * @returns {Object} Context summary
     */
    getContextSummary(context) {
        return {
            currentIntent: context.currentIntent,
            messageCount: context.messages?.length || 0,
            hasBrowsingHistory: context.browsingHistory?.length > 0,
            hasCartItems: context.cartItems?.length > 0,
            preferences: context.preferences || {}
        };
    }

    /**
     * Generate follow-up question based on context
     * @param {Object} context - Conversation context
     * @returns {string} Follow-up question
     */
    generateFollowUpQuestion(context) {
        if (context.currentIntent === 'gift_suggestion') {
            const hasBudget = context.preferences?.budget;
            const hasRelationship = context.preferences?.relationship;
            const hasOccasion = context.preferences?.occasion;

            if (!hasBudget) {
                return "What's your budget range for this gift?";
            } else if (!hasRelationship) {
                return "What's your relationship with the recipient?";
            } else if (!hasOccasion) {
                return "What's the occasion for this gift?";
            }
        }

        return "Is there anything else I can help you with?";
    }

    /**
     * Calculate conversation satisfaction score
     * @param {Array} messages - Conversation messages
     * @returns {number} Satisfaction score (0-1)
     */
    calculateSatisfactionScore(messages) {
        if (!messages || messages.length === 0) return 0.5;

        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        // More messages = more engaged
        const engagementScore = Math.min(userMessages.length / 5, 1.0);

        // Check if user asked for help
        const helpRequested = userMessages.some(m => 
            m.content.toLowerCase().includes('help') || 
            m.content.toLowerCase().includes('thank')
        );

        return (engagementScore + (helpRequested ? 0.2 : 0)) / 1.2;
    }
}

module.exports = new ChatbotService();
