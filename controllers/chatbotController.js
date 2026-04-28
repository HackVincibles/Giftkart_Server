const ChatbotConversation = require('../models/ChatbotConversation');
const Product = require('../models/Product');
const AIRecommendation = require('../models/AIRecommendation');
const { getGiftRecommendations } = require('./aiRecommendationController');
const { chatbotService } = require('../services/ai');

// Start or continue chatbot conversation
const startConversation = async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user._id;
        
        // Detect intent and entities (now async with Gemini)
        const intent = await detectIntent(message);
        const entities = await extractEntities(message);
        
        // Find or create conversation
        let conversation;
        if (sessionId) {
            conversation = await ChatbotConversation.findOne({ sessionId, user: userId });
        }
        
        if (!conversation) {
            conversation = await ChatbotConversation.create({
                user: userId,
                sessionId: sessionId || generateSessionId(),
                messages: [],
                context: {
                    currentIntent: intent,
                    browsingHistory: [],
                    cartItems: [],
                    preferences: {}
                }
            });
        }
        
        // Add user message
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            metadata: {
                intent,
                confidence: 0.8,
                entities
            }
        });
        
        // Update context
        conversation.context.currentIntent = intent;
        
        // Generate response (now async with Gemini)
        const responseData = await generateResponse(intent, entities, conversation.context, message);
        
        // Add assistant response
        conversation.messages.push({
            role: 'assistant',
            content: responseData.content,
            timestamp: new Date(),
            metadata: {
                intent,
                confidence: 0.85,
                entities,
                suggestedActions: responseData.suggestedActions,
                productReferences: responseData.productReferences
            }
        });
        
        // If intent is gift_suggestion and enough context, trigger recommendation
        if (intent === 'gift_suggestion' && entities.length >= 2) {
            try {
                const context = {
                    budget: entities.find(e => e.type === 'budget')?.value,
                    relationship: entities.find(e => e.type === 'relationship')?.value,
                    occasion: entities.find(e => e.type === 'occasion')?.value
                };
                
                const recommendationReq = {
                    body: {
                        query: message,
                        queryType: 'person-description',
                        context
                    },
                    user: req.user
                };
                
                const recommendationRes = await getGiftRecommendations(recommendationReq, {
                    json: (data) => {
                        conversation.context.lastRecommendationId = data.data.id;
                        responseData.content += `\n\nBased on what you told me, I found some great gift suggestions! Check out the recommendations I've prepared for you.`;
                        responseData.suggestedActions.push('View Recommendations');
                    }
                });
            } catch (error) {
                console.log('Could not auto-generate recommendations:', error.message);
            }
        }
        
        await conversation.save();
        
        res.json({
            success: true,
            data: {
                sessionId: conversation.sessionId,
                message: responseData.content,
                suggestedActions: responseData.suggestedActions,
                productReferences: responseData.productReferences,
                intent,
                entities
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing chat message',
            error: error.message
        });
    }
};

// Get conversation history
const getConversationHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const conversation = await ChatbotConversation.findOne({
            sessionId,
            user: req.user._id
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }
        
        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching conversation',
            error: error.message
        });
    }
};

// Get all user conversations
const getUserConversations = async (req, res) => {
    try {
        const conversations = await ChatbotConversation.find({
            user: req.user._id,
            isActive: true
        })
        .sort({ startedAt: -1 })
        .limit(10);
        
        res.json({
            success: true,
            count: conversations.length,
            data: conversations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching conversations',
            error: error.message
        });
    }
};

// End conversation
const endConversation = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const conversation = await ChatbotConversation.findOne({
            sessionId,
            user: req.user._id
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }
        
        conversation.isActive = false;
        conversation.endedAt = new Date();
        await conversation.save();
        
        res.json({
            success: true,
            message: 'Conversation ended'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error ending conversation',
            error: error.message
        });
    }
};

// Provide feedback on conversation
const provideFeedback = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { rating, helpful, resolved, feedback } = req.body;
        
        const conversation = await ChatbotConversation.findOne({
            sessionId,
            user: req.user._id
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }
        
        conversation.satisfaction = {
            rating,
            helpful,
            resolved,
            feedback
        };
        
        await conversation.save();
        
        res.json({
            success: true,
            message: 'Feedback recorded'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error recording feedback',
            error: error.message
        });
    }
};

// Helper function to generate session ID
const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
    startConversation,
    getConversationHistory,
    getUserConversations,
    endConversation,
    provideFeedback
};
