const Product = require('../models/Product');
const AIRecommendation = require('../models/AIRecommendation');
const User = require('../models/User');
const { giftMindReader } = require('../services/ai');
const geminiService = require('../services/geminiService');

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
        const { query, context } = req.body;
        const userId = req.user?._id;

        // 1. MASTER NLP ANALYSIS (Single call for speed!)
        const analysis = await geminiService.analyzeGiftRequest(query);
        console.log("🚀 MASTER AI ANALYSIS:", analysis);
        
        // 2. TARGETED PRODUCT SEARCH
        const combinedKeywords = [...new Set([...(analysis.searchKeywords || []), ...(analysis.interests || [])])];
        let products = [];
        
        if (combinedKeywords.length > 0) {
            const searchRegex = combinedKeywords.join('|');
            products = await Product.find({
                isActive: true,
                $or: [
                    { name: { $regex: searchRegex, $options: 'i' } },
                    { description: { $regex: searchRegex, $options: 'i' } },
                    { category: { $regex: searchRegex, $options: 'i' } },
                    { 'aiTags.category': { $in: combinedKeywords } }
                ]
            }).populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified').limit(50);
        }

        // 3. Fallback to trait-based search if no direct category match
        if (products.length < 2) {
            const traitRegex = analysis.personalityTraits.join('|');
            const fallbackProducts = await Product.find({
                isActive: true,
                $or: [
                    { description: { $regex: traitRegex, $options: 'i' } },
                    { 'aiTags.personalityTraits': { $in: analysis.personalityTraits } }
                ]
            }).populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified').limit(20);
            
            // Merge results
            products = [...products, ...fallbackProducts];
        }

        // 3.5 GENDER-BASED FILTERING (Crucial fix for Brother/Sister mismatch)
        if (analysis.targetGender && analysis.targetGender !== 'neutral') {
            const isMale = analysis.targetGender === 'male';
            const isFemale = analysis.targetGender === 'female';
            
            products = products.filter(p => {
                const desc = (p.description + " " + p.name + " " + p.category).toLowerCase();
                
                // If searching for male, filter out obviously feminine items unless highly matched
                if (isMale) {
                    const feminineWords = ['makeup', 'lipstick', 'skirt', 'dress', 'feminine', 'women', 'girl', 'sister', 'lady'];
                    const hasFeminineWord = feminineWords.some(w => desc.includes(w));
                    // Check if it's explicitly tagged for men
                    const isForMen = desc.includes('men') || desc.includes('boy') || desc.includes('brother') || desc.includes('him');
                    if (hasFeminineWord && !isForMen) return false;
                }
                
                // If searching for female, filter out obviously masculine items
                if (isFemale) {
                    const masculineWords = ['beard', 'shaving', 'masculine', 'men', 'boy', 'brother', 'gentleman'];
                    const hasMasculineWord = masculineWords.some(w => desc.includes(w));
                    const isForWomen = desc.includes('women') || desc.includes('girl') || desc.includes('sister') || desc.includes('her');
                    if (hasMasculineWord && !isForWomen) return false;
                }
                
                return true;
            });
        }

        // 3. BUDGET FILTERING (If provided in query or context)
        const budgetMatch = query.match(/(\d+)/);
        const maxBudget = context?.budget?.max || (budgetMatch ? parseInt(budgetMatch[0]) * 1.5 : null);
        
        if (maxBudget && products.length > 0) {
            products = products.filter(p => p.basePrice <= maxBudget);
        }

        // 4. Determine if we should handle as Natural Conversation
        const intent = await geminiService.detectIntent(query);
        const isGreeting = ['hi', 'hello', 'hey'].includes(query.toLowerCase().trim());

        if (products.length === 0 && (isGreeting || intent === 'general')) {
             const chatbotRes = await geminiService.generateChatbotResponse(intent, [], query);
             return res.json({
                 success: true,
                 conversationMode: true,
                 data: {
                     message: chatbotRes.content,
                     suggestedActions: chatbotRes.suggestedActions,
                     analysis,
                     recommendations: []
                 }
             });
        }

        // 5. Global fallback if still nothing (Use personality traits for broad match)
        if (products.length === 0) {
            const traitRegex = analysis.personalityTraits.join('|');
            products = await Product.find({
                isActive: true,
                $or: [
                    { description: { $regex: traitRegex, $options: 'i' } },
                    { 'aiTags.personalityTraits': { $in: analysis.personalityTraits } }
                ]
            }).populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified').limit(20);
        }

        // Final fallback to trending
        if (products.length === 0) {
            products = await Product.find({ isActive: true })
                .populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified')
                .sort({ averageRating: -1 })
                .limit(10);
        }

        const scoredProducts = await Promise.all(products.map(async (product) => {
            const scoreData = await geminiService.calculateGiftSuccessScore(product, context || {}, analysis);
            return { product, score: scoreData.overall, scoreBreakdown: scoreData };
        }));

        scoredProducts.sort((a, b) => b.score - a.score);
        const topRecommendations = scoredProducts.slice(0, 15);

        const recommendations = topRecommendations.map(({ product, score, scoreBreakdown }) => {
            return {
                product: product._id,
                score: Math.round(score * 100) / 100,
                scoreBreakdown,
                reasoning: scoreBreakdown.rating || 'A great match for your description',
                whyPerfect: generateWhyPerfect(product, analysis),
                customizationSuggestions: generateCustomizationSuggestions(product),
                priceRange: { min: product.basePrice, max: product.basePrice + 500 },
                creator: product.creator,
                estimatedDelivery: '3-5 days'
            };
        });

        // Save recommendation to database
        const recommendationRecord = await AIRecommendation.create({
            user: userId,
            query,
            queryType: 'conversational',
            context: context || {},
            aiAnalysis: { giftMindReader: analysis },
            recommendations
        });

        // Generate a humanized, conversational response using Gemini
        const humanMessage = await geminiService.generateHumanizedResponse(
            query, 
            analysis, 
            recommendations.length, 
            context?.budget || { max: 5000 }
        );

        res.json({
            success: true,
            conversationMode: false,
            data: {
                id: recommendationRecord._id,
                query,
                analysis,
                message: humanMessage,
                recommendations: recommendations.map(r => ({
                    ...r,
                    product: topRecommendations.find(tp => tp.product._id.toString() === r.product.toString())?.product
                })),
                totalFound: recommendations.length
            }
        });
    } catch (error) {
        console.error('AI Suggestion Error:', error);
        res.status(500).json({
            success: false,
            message: 'AI is having trouble thinking. Try again?',
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
