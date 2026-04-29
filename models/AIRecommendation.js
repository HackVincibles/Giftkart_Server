const mongoose = require('mongoose');

const AIRecommendationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    query: {
        type: String,
        required: true
    },
    queryType: {
        type: String,
        enum: ['person-description', 'occasion-based', 'emotion-based', 'budget-constrained', 'general', 'conversational', 'description'],
        required: true
    },
    context: {
        budget: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'INR'
            }
        },
        occasion: String,
        relationship: String,
        age: Number,
        gender: String,
        interests: [String],
        personalityTraits: [String],
        tone: {
            type: String,
            enum: ['funny', 'emotional', 'formal', 'casual', 'romantic']
        },
        urgency: {
            type: String,
            enum: ['immediate', 'within-week', 'within-month', 'flexible']
        }
    },
    aiAnalysis: {
        giftMindReader: {
            primaryEmotion: String,
            secondaryEmotions: [String],
            personalityProfile: String,
            confidence: Number
        },
        emotionBasedSuggestions: [{
            emotion: String,
            giftCategories: [String],
            reasoning: String
        }],
        personalityTwin: {
            matchedProfile: String,
            similarityScore: Number,
            recommendations: [String]
        },
        giftSuccessScore: {
            overall: Number,
            emotionalImpact: Number,
            practicality: Number,
            uniqueness: Number
        }
    },
    recommendations: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        score: Number,
        reasoning: String,
        whyPerfect: String,
        customizationSuggestions: [String],
        priceRange: {
            min: Number,
            max: Number
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        estimatedDelivery: String
    }],
    followUpQuestions: [{
        question: String,
        options: [String],
        answered: Boolean,
        answer: String
    }],
    userFeedback: {
        clickedProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        purchasedProduct: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        rating: Number,
        helpful: Boolean,
        comments: String
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: function() {
            return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }
    }
});

AIRecommendationSchema.index({ user: 1, generatedAt: -1 });
AIRecommendationSchema.index({ 'context.occasion': 1 });
AIRecommendationSchema.index({ 'aiAnalysis.giftMindReader.primaryEmotion': 1 });

module.exports = mongoose.model('AIRecommendation', AIRecommendationSchema);
