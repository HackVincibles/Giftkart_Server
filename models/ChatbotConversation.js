const mongoose = require('mongoose');

const ChatbotConversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        metadata: {
            intent: String,
            confidence: Number,
            entities: [{
                type: String,
                value: String,
                confidence: Number
            }],
            suggestedActions: [String],
            productReferences: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            }]
        }
    }],
    context: {
        currentIntent: String,
        browsingHistory: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        cartItems: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        preferences: {
            budget: Number,
            categories: [String],
            occasions: [String]
        },
        lastSearchQuery: String,
        lastRecommendationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AIRecommendation'
        }
    },
    satisfaction: {
        rating: Number,
        helpful: Boolean,
        resolved: Boolean,
        feedback: String
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: Date,
    isActive: {
        type: Boolean,
        default: true
    }
});

ChatbotConversationSchema.index({ user: 1, startedAt: -1 });
ChatbotConversationSchema.index({ isActive: 1 });

module.exports = mongoose.model('ChatbotConversation', ChatbotConversationSchema);
