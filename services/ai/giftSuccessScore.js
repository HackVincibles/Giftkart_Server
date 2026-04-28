/**
 * AI Gift Success Score Service
 * Calculates the likelihood of gift success based on multiple factors
 * Now uses Gemini API for real AI scoring
 */

const geminiService = require('../geminiService');

class GiftSuccessScore {
    /**
     * Calculate comprehensive gift success score
     * @param {Object} product - Product object
     * @param {Object} context - User context (budget, occasion, relationship, etc.)
     * @param {Object} analysis - AI analysis result (emotions, personality)
     * @returns {Promise<Object>} Detailed score breakdown
     */
    async calculateScore(product, context, analysis) {
        try {
            // Use Gemini for real AI scoring
            const aiScore = await geminiService.calculateGiftSuccessScore(product, context, analysis);
            
            if (aiScore && aiScore.overall !== undefined) {
                return aiScore;
            }
            
            // Fallback to rule-based scoring
            return this.fallbackScore(product, context, analysis);
        } catch (error) {
            console.error('Gemini scoring failed, using fallback:', error);
            return this.fallbackScore(product, context, analysis);
        }
    }

    /**
     * Fallback rule-based scoring
     */
    fallbackScore(product, context, analysis) {
        const scores = {
            overall: 0,
            emotionalImpact: 0,
            practicality: 0,
            uniqueness: 0,
            budgetFit: 0,
            relationshipFit: 0,
            occasionFit: 0,
            quality: 0,
            socialProof: 0
        };

        // Emotional Impact Score (30% weight)
        scores.emotionalImpact = this.calculateEmotionalImpact(product, analysis);
        
        // Practicality Score (20% weight)
        scores.practicality = this.calculatePracticality(product, context);
        
        // Uniqueness Score (15% weight)
        scores.uniqueness = this.calculateUniqueness(product);
        
        // Budget Fit Score (15% weight)
        scores.budgetFit = this.calculateBudgetFit(product, context);
        
        // Relationship Fit Score (10% weight)
        scores.relationshipFit = this.calculateRelationshipFit(product, context);
        
        // Occasion Fit Score (5% weight)
        scores.occasionFit = this.calculateOccasionFit(product, context);
        
        // Quality Score (5% weight)
        scores.quality = this.calculateQuality(product);
        
        // Social Proof Score (5% weight)
        scores.socialProof = this.calculateSocialProof(product);

        // Calculate weighted overall score
        scores.overall = (
            scores.emotionalImpact * 0.30 +
            scores.practicality * 0.20 +
            scores.uniqueness * 0.15 +
            scores.budgetFit * 0.15 +
            scores.relationshipFit * 0.10 +
            scores.occasionFit * 0.05 +
            scores.quality * 0.05 +
            scores.socialProof * 0.05
        );

        return {
            ...scores,
            overall: Math.min(scores.overall, 1.0),
            rating: this.getRating(scores.overall)
        };
    }

    /**
     * Calculate emotional impact score
     */
    calculateEmotionalImpact(product, analysis) {
        let score = 0.5;

        if (product.emotionalContext && analysis.primaryEmotion) {
            const emotionMatch = product.emotionalContext.find(e => e.emotion === analysis.primaryEmotion);
            if (emotionMatch) {
                score = Math.min(emotionMatch.intensity || 0.7, 1.0);
            }
        }

        if (product.emotionalImpactAverage) {
            score = (score + (product.emotionalImpactAverage / 5)) / 2;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Calculate practicality score
     */
    calculatePracticality(product, context) {
        let score = 0.5;

        if (product.category === 'standard' || product.category === 'semi-custom') {
            score += 0.2;
        }

        if (product.customizableFields && product.customizableFields.length > 0) {
            score += 0.1;
        }

        if (product.inventory && product.inventory.productionTime) {
            const normalTime = product.inventory.productionTime.normal || 7;
            if (normalTime <= 5) score += 0.1;
            else if (normalTime <= 10) score += 0.05;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Calculate uniqueness score
     */
    calculateUniqueness(product) {
        let score = 0.5;

        if (product.category === 'fully-custom') {
            score += 0.3;
        } else if (product.category === 'semi-custom') {
            score += 0.2;
        }

        if (product.category === 'ai-generated') {
            score += 0.3;
        }

        if (product.inventory && product.inventory.limitedEdition) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Calculate budget fit score
     */
    calculateBudgetFit(product, context) {
        if (!context.budget) return 0.5;

        const price = product.pricing?.base || 0;
        const min = context.budget.min || 0;
        const max = context.budget.max || Infinity;

        if (price >= min && price <= max) {
            return 1.0;
        } else if (price < min) {
            return 0.7;
        } else if (price > max) {
            const overage = (price - max) / max;
            return Math.max(0.5 - overage, 0);
        }

        return 0.5;
    }

    /**
     * Calculate relationship fit score
     */
    calculateRelationshipFit(product, context) {
        if (!context.relationship || !product.targetAudience) return 0.5;

        const match = product.targetAudience.find(a => a.relationship === context.relationship);
        if (match) {
            return match.relevance || 0.8;
        }

        return 0.3;
    }

    /**
     * Calculate occasion fit score
     */
    calculateOccasionFit(product, context) {
        if (!context.occasion || !product.emotionalContext) return 0.5;

        for (const emo of product.emotionalContext) {
            if (emo.occasions && emo.occasions.includes(context.occasion)) {
                return 0.8;
            }
        }

        return 0.3;
    }

    /**
     * Calculate quality score
     */
    calculateQuality(product) {
        let score = 0.5;

        if (product.averageRating) {
            score = product.averageRating / 5;
        }

        if (product.reviews && product.reviews.length > 0) {
            const recentReviews = product.reviews.slice(-10);
            const avgRecent = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
            score = (score + (avgRecent / 5)) / 2;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Calculate social proof score
     */
    calculateSocialProof(product) {
        let score = 0.5;

        if (product.popularity) {
            if (product.popularity.orders > 100) {
                score += 0.3;
            } else if (product.popularity.orders > 50) {
                score += 0.2;
            } else if (product.popularity.orders > 10) {
                score += 0.1;
            }

            if (product.popularity.views > 1000) {
                score += 0.1;
            }
        }

        if (product.reviews && product.reviews.length > 20) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Get rating label based on score
     */
    getRating(score) {
        if (score >= 0.9) return 'Excellent Match';
        if (score >= 0.8) return 'Great Match';
        if (score >= 0.7) return 'Good Match';
        if (score >= 0.6) return 'Fair Match';
        if (score >= 0.5) return 'Average Match';
        return 'Poor Match';
    }
}

module.exports = new GiftSuccessScore();
