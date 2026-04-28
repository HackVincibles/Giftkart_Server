const AutoGifting = require('../models/AutoGifting');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// Create auto-gifting recipient
const createAutoGiftingRecipient = async (req, res) => {
    try {
        const {
            recipient,
            occasion,
            giftPreferences,
            autoGiftSettings
        } = req.body;

        const autoGifting = await AutoGifting.create({
            user: req.user._id,
            recipient,
            occasion,
            giftPreferences: giftPreferences || {},
            autoGiftSettings: autoGiftSettings || { enabled: false, requireApproval: true }
        });

        res.status(201).json({
            success: true,
            message: 'Auto-gifting recipient created successfully',
            data: autoGifting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating auto-gifting recipient',
            error: error.message
        });
    }
};

// Get all auto-gifting recipients for user
const getAutoGiftingRecipients = async (req, res) => {
    try {
        const recipients = await AutoGifting.find({ user: req.user._id })
            .sort({ 'occasion.date': 1 });

        res.json({
            success: true,
            count: recipients.length,
            data: recipients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching auto-gifting recipients',
            error: error.message
        });
    }
};

// Get single auto-gifting recipient
const getAutoGiftingRecipient = async (req, res) => {
    try {
        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        res.json({
            success: true,
            data: autoGifting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching auto-gifting recipient',
            error: error.message
        });
    }
};

// Update auto-gifting recipient
const updateAutoGiftingRecipient = async (req, res) => {
    try {
        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            autoGifting[key] = updates[key];
        });

        autoGifting.updatedAt = Date.now();
        await autoGifting.save();

        res.json({
            success: true,
            message: 'Auto-gifting recipient updated successfully',
            data: autoGifting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating auto-gifting recipient',
            error: error.message
        });
    }
};

// Delete auto-gifting recipient
const deleteAutoGiftingRecipient = async (req, res) => {
    try {
        const autoGifting = await AutoGifting.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        res.json({
            success: true,
            message: 'Auto-gifting recipient deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting auto-gifting recipient',
            error: error.message
        });
    }
};

// Get upcoming occasions (next 30 days)
const getUpcomingOccasions = async (req, res) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const upcoming = await AutoGifting.find({
            user: req.user._id,
            'occasion.date': {
                $gte: new Date(),
                $lte: thirtyDaysFromNow
            }
        }).sort({ 'occasion.date': 1 });

        res.json({
            success: true,
            count: upcoming.length,
            data: upcoming
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming occasions',
            error: error.message
        });
    }
};

// Schedule a gift for an occasion
const scheduleGift = async (req, res) => {
    try {
        const { autoGiftingId, productId, message, autoGenerated } = req.body;

        const autoGifting = await AutoGifting.findOne({
            _id: autoGiftingId,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const scheduledGift = {
            gift: productId,
            message,
            autoGenerated: autoGenerated || false,
            scheduledDate: autoGifting.occasion.date,
            status: 'pending'
        };

        autoGifting.scheduledGifts.push(scheduledGift);
        await autoGifting.save();

        res.status(201).json({
            success: true,
            message: 'Gift scheduled successfully',
            data: scheduledGift
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error scheduling gift',
            error: error.message
        });
    }
};

// Get relationship insights
const getRelationshipInsights = async (req, res) => {
    try {
        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        // Generate insights based on data
        const insights = {
            ...autoGifting.relationshipInsights,
            suggestions: []
        };

        // Check for forgotten moments
        const today = new Date();
        const lastInteraction = autoGifting.relationshipInsights.lastInteraction;
        
        if (lastInteraction) {
            const daysSinceInteraction = Math.floor((today - lastInteraction) / (1000 * 60 * 60 * 24));
            if (daysSinceInteraction > 90) {
                insights.suggestions.push(`It's been ${daysSinceInteraction} days since you last appreciated ${autoGifting.recipient.name}. Consider sending a thoughtful gift.`);
            }
        }

        // Check for missed occasions
        const missedOccasions = autoGifting.relationshipInsights.forgottenMoments.filter(m => m.missed);
        if (missedOccasions.length > 0) {
            insights.suggestions.push(`You missed ${missedOccasions.length} occasions for ${autoGifting.recipient.name}. Enable auto-gifting to avoid this in the future.`);
        }

        // Appreciation score analysis
        if (autoGifting.relationshipInsights.appreciationScore < 50) {
            insights.suggestions.push('Your appreciation score is low. Consider sending more frequent gifts to strengthen this relationship.');
        }

        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching relationship insights',
            error: error.message
        });
    }
};

// Update relationship insights
const updateRelationshipInsights = async (req, res) => {
    try {
        const { lastInteraction, notes } = req.body;

        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        if (lastInteraction) {
            autoGifting.relationshipInsights.lastInteraction = new Date(lastInteraction);
        }

        if (notes) {
            autoGifting.relationshipInsights.notes = notes;
        }

        // Update appreciation score based on interaction
        if (lastInteraction) {
            const currentScore = autoGifting.relationshipInsights.appreciationScore || 0;
            autoGifting.relationshipInsights.appreciationScore = Math.min(currentScore + 10, 100);
        }

        await autoGifting.save();

        res.json({
            success: true,
            message: 'Relationship insights updated',
            data: autoGifting.relationshipInsights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating relationship insights',
            error: error.message
        });
    }
};

// Get AI suggestions for auto-gifting
const getAutoGiftingSuggestions = async (req, res) => {
    try {
        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        // Generate AI suggestions based on recipient data
        const suggestions = [];

        // Suggest based on occasion
        const occasion = autoGifting.occasion.type;
        if (occasion === 'birthday') {
            suggestions.push({
                date: new Date(),
                suggestion: `Consider a personalized gift for ${autoGifting.recipient.name}'s birthday`,
                confidence: 0.85,
                actedUpon: false
            });
        } else if (occasion === 'anniversary') {
            suggestions.push({
                date: new Date(),
                suggestion: `A romantic or sentimental gift would be perfect for this anniversary`,
                confidence: 0.9,
                actedUpon: false
            });
        }

        // Suggest based on interests
        if (autoGifting.giftPreferences.interests && autoGifting.giftPreferences.interests.length > 0) {
            suggestions.push({
                date: new Date(),
                suggestion: `Gifts related to ${autoGifting.giftPreferences.interests.join(', ')} would align with their interests`,
                confidence: 0.8,
                actedUpon: false
            });
        }

        // Suggest based on relationship
        const relationship = autoGifting.recipient.relationship;
        if (relationship === 'partner') {
            suggestions.push({
                date: new Date(),
                suggestion: 'Consider a romantic or experience-based gift to create lasting memories',
                confidence: 0.85,
                actedUpon: false
            });
        }

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting auto-gifting suggestions',
            error: error.message
        });
    }
};

// Enable/disable auto-gifting for a recipient
const toggleAutoGifting = async (req, res) => {
    try {
        const { enabled, requireApproval, defaultBudget } = req.body;

        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        if (enabled !== undefined) autoGifting.autoGiftSettings.enabled = enabled;
        if (requireApproval !== undefined) autoGifting.autoGiftSettings.requireApproval = requireApproval;
        if (defaultBudget) autoGifting.autoGiftSettings.defaultBudget = defaultBudget;

        await autoGifting.save();

        res.json({
            success: true,
            message: 'Auto-gifting settings updated',
            data: autoGifting.autoGiftSettings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating auto-gifting settings',
            error: error.message
        });
    }
};

// Get scheduled gifts for a recipient
const getScheduledGifts = async (req, res) => {
    try {
        const autoGifting = await AutoGifting.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('scheduledGifts.gift');

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        res.json({
            success: true,
            count: autoGifting.scheduledGifts.length,
            data: autoGifting.scheduledGifts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching scheduled gifts',
            error: error.message
        });
    }
};

// Cancel scheduled gift
const cancelScheduledGift = async (req, res) => {
    try {
        const { autoGiftingId, scheduledGiftId } = req.params;

        const autoGifting = await AutoGifting.findOne({
            _id: autoGiftingId,
            user: req.user._id
        });

        if (!autoGifting) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gifting recipient not found'
            });
        }

        const scheduledGift = autoGifting.scheduledGifts.id(scheduledGiftId);
        if (!scheduledGift) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled gift not found'
            });
        }

        if (scheduledGift.status === 'sent') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a gift that has already been sent'
            });
        }

        scheduledGift.status = 'cancelled';
        await autoGifting.save();

        res.json({
            success: true,
            message: 'Scheduled gift cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cancelling scheduled gift',
            error: error.message
        });
    }
};

module.exports = {
    createAutoGiftingRecipient,
    getAutoGiftingRecipients,
    getAutoGiftingRecipient,
    updateAutoGiftingRecipient,
    deleteAutoGiftingRecipient,
    getUpcomingOccasions,
    scheduleGift,
    getRelationshipInsights,
    updateRelationshipInsights,
    getAutoGiftingSuggestions,
    toggleAutoGifting,
    getScheduledGifts,
    cancelScheduledGift
};
