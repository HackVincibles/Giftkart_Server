const Product = require('../models/Product');
const AIRecommendation = require('../models/AIRecommendation');
const User = require('../models/User');
const { giftMindReader, emotionBasedSuggestions, personalityTwin, giftSuccessScore } = require('../services/ai');

// Helper function to generate follow-up questions
const generateFollowUpQuestions = (query, context) => {
    const questions = [];

    if (!context.budget) {
        questions.push({
            question: 'What is your budget range for this gift?',
            options: ['Under ₹500', '₹500-₹1000', '₹1000-₹2000', '₹2000-₹5000', 'Above ₹5000'],
            answered: false
        });
    }

    if (!context.occasion) {
        questions.push({
            question: 'What is the occasion for this gift?',
            options: ['Birthday', 'Anniversary', 'Festival', 'Achievement', 'Just because'],
            answered: false
        });
    }

    if (!context.tone) {
        questions.push({
            question: 'What tone should the gift convey?',
            options: ['Funny', 'Emotional', 'Formal', 'Casual', 'Romantic'],
            answered: false
        });
    }

    if (!context.relationship) {
        questions.push({
            question: 'What is your relationship with the recipient?',
            options: ['Partner', 'Parent', 'Friend', 'Sibling', 'Colleague', 'Other'],
            answered: false
        });
    }

    return questions.slice(0, 3);
};

// Helper function to generate "Why it's perfect" text
const generateWhyPerfect = (product, analysis) => {
    const reasons = [];
    
    if (product.category === 'semi-custom') {
        reasons.push('Quick customization available');
    } else if (product.category === 'fully-custom') {
        reasons.push('Fully personalized for unique touch');
    }

    if (product.emotionalImpactAverage >= 4) {
        reasons.push('Known to create emotional moments');
    }

    if (analysis.personalityTraits.includes('creative') && product.customizableFields.length > 0) {
        reasons.push('Perfect for creative personalization');
    }

    return reasons.length > 0 ? reasons.join('. ') : 'A thoughtful choice based on your needs';
};

// Helper function to generate customization suggestions
const generateCustomizationSuggestions = (product) => {
    const suggestions = [];
    
    if (product.customizableFields) {
        product.customizableFields.forEach(field => {
            if (field.fieldType === 'text') {
                suggestions.push(`Add a personal message in the ${field.fieldName}`);
            } else if (field.fieldType === 'image') {
                suggestions.push(`Upload a memorable photo for ${field.fieldName}`);
            } else if (field.fieldType === 'color') {
                suggestions.push(`Choose colors that match their preference`);
            }
        });
    }

    return suggestions.length > 0 ? suggestions : ['Add a personal touch with custom message'];
};

// Main recommendation function
const getGiftRecommendations = async (req, res) => {
    try {
        const { query, queryType, context } = req.body;
        const userId = req.user?._id;

        // Analyze the query using AI service (now async with Gemini)
        const analysis = await giftMindReader.analyzePersonDescription(query);

        // Build product filter based on analysis
        const filter = { isActive: true };

        // Filter by emotion-based categories
        const emotionCategories = giftMindReader.getEmotionBasedGifts(analysis.primaryEmotion);
        if (emotionCategories.length > 0) {
            filter.aiTags = { $elemMatch: { category: { $in: emotionCategories } } };
        }

        // Filter by budget if provided
        if (context?.budget?.min || context?.budget?.max) {
            filter['pricing.base'] = {};
            if (context.budget.min) filter['pricing.base'].$gte = context.budget.min;
            if (context.budget.max) filter['pricing.base'].$lte = context.budget.max;
        }

        // Filter by relationship if provided
        if (context?.relationship) {
            const relationshipCategories = giftMindReader.getRelationshipBasedGifts(context.relationship);
            if (relationshipCategories.length > 0) {
                filter['aiTags.category'] = { $in: relationshipCategories };
            }
        }

        // Fetch products
        let products = await Product.find(filter)
            .populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified')
            .limit(50);

        // If no products found with emotion filter, try broader search
        if (products.length === 0) {
            delete filter.aiTags;
            delete filter['aiTags.category'];
            products = await Product.find(filter)
                .populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified')
                .limit(50);
        }

        // Calculate scores using AI service (now async with Gemini)
        const scoredProducts = await Promise.all(products.map(async (product) => {
            const scoreData = await giftSuccessScore.calculateScore(product, context || {}, analysis);
            return {
                product,
                score: scoreData.overall,
                scoreBreakdown: scoreData
            };
        }));

        scoredProducts.sort((a, b) => b.score - a.score);

        // Take top 10-20 recommendations
        const topRecommendations = scoredProducts.slice(0, 20);

        // Generate reasoning for each recommendation
        const recommendations = topRecommendations.map(({ product, score, scoreBreakdown }) => {
            const reasoning = [];
            
            if (product.emotionalContext && product.emotionalContext.some(e => e.emotion === analysis.primaryEmotion)) {
                reasoning.push(`Matches the ${analysis.primaryEmotion} emotion you described`);
            }
            
            if (product.averageRating >= 4) {
                reasoning.push(`Highly rated by other buyers (${product.averageRating}/5)`);
            }
            
            if (product.emotionalImpactAverage >= 4) {
                reasoning.push(`Strong emotional impact on recipients`);
            }

            return {
                product: product._id,
                score: Math.round(score * 100) / 100,
                scoreBreakdown,
                reasoning: reasoning.join('. ') || 'Well-suited based on your description',
                whyPerfect: generateWhyPerfect(product, analysis),
                customizationSuggestions: generateCustomizationSuggestions(product),
                priceRange: {
                    min: product.pricing.base,
                    max: product.pricing.base + (product.pricing.customizationFee || 0)
                },
                creator: product.creator,
                estimatedDelivery: product.inventory ? `${product.inventory.productionTime.normal}-${product.inventory.productionTime.urgent} days` : '5-7 days'
            };
        });

        // Generate follow-up questions
        const followUpQuestions = generateFollowUpQuestions(query, context || {});

        // Get emotion-based suggestions (now async with Gemini)
        const emotionSuggestions = await emotionBasedSuggestions.generateSuggestions(
            analysis.primaryEmotion,
            analysis.secondaryEmotions,
            context
        );

        // Get personality twin analysis (now async with Gemini)
        const personalityAnalysis = await personalityTwin.findPersonalityTwin(query);

        // Save recommendation to database
        const recommendationRecord = await AIRecommendation.create({
            user: userId,
            query,
            queryType,
            context: context || {},
            aiAnalysis: {
                giftMindReader: analysis,
                emotionBasedSuggestions: emotionSuggestions,
                personalityTwin: personalityAnalysis,
                giftSuccessScore: {
                    overall: topRecommendations[0]?.score || 0.5,
                    emotionalImpact: scoreBreakdown?.emotionalImpact || 0.7,
                    practicality: scoreBreakdown?.practicality || 0.7,
                    uniqueness: scoreBreakdown?.uniqueness || 0.6
                }
            },
            recommendations,
            followUpQuestions
        });

        res.json({
            success: true,
            data: {
                id: recommendationRecord._id,
                query,
                analysis,
                personalityAnalysis,
                recommendations: recommendations.map(r => ({
                    ...r,
                    product: topRecommendations.find(tp => tp.product._id.toString() === r.product.toString())?.product
                })),
                followUpQuestions,
                totalFound: recommendations.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating recommendations',
            error: error.message
        });
    }
};

// Get recommendation history for user
const getRecommendationHistory = async (req, res) => {
    try {
        const recommendations = await AIRecommendation.find({ user: req.user._id })
            .sort({ generatedAt: -1 })
            .limit(20);

        res.json({
            success: true,
            count: recommendations.length,
            data: recommendations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recommendation history',
            error: error.message
        });
    }
};

// Provide feedback on recommendation
const provideFeedback = async (req, res) => {
    try {
        const { recommendationId, clickedProducts, purchasedProduct, rating, helpful, comments } = req.body;

        const recommendation = await AIRecommendation.findById(recommendationId);
        
        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: 'Recommendation not found'
            });
        }

        if (recommendation.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to provide feedback'
            });
        }

        recommendation.userFeedback = {
            clickedProducts,
            purchasedProduct,
            rating,
            helpful,
            comments
        };

        await recommendation.save();

        res.json({
            success: true,
            message: 'Feedback recorded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error recording feedback',
            error: error.message
        });
    }
};

module.exports = {
    getGiftRecommendations,
    getRecommendationHistory,
    provideFeedback
};
