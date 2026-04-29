const AutoGiftCalendar = require('../models/AutoGiftCalendar');
const Product = require('../models/Product');
const { giftMindReader } = require('../services/ai');
const notificationService = require('../services/notificationService');

// Create auto-gift calendar entry
const createAutoGift = async (req, res) => {
    try {
        const {
            recipient,
            occasion,
            customOccasion,
            occasionDate,
            occasionTime,
            timezone,
            isRecurring,
            recurringPattern,
            deliveryAddress,
            giftPreferences,
            notes
        } = req.body;

        const autoGift = await AutoGiftCalendar.create({
            user: req.user._id,
            recipient,
            occasion,
            customOccasion,
            occasionDate,
            occasionTime,
            timezone,
            isRecurring,
            recurringPattern,
            deliveryAddress,
            giftPreferences,
            notes,
            status: 'active'
        });

        await autoGift.save();

        // Send Notification
        await notificationService.notifyScheduleAdded(req.user._id, recipient.name || recipient, occasion);

        res.status(201).json({
            success: true,
            message: 'Auto-gift scheduled successfully',
            data: autoGift
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating auto-gift',
            error: error.message
        });
    }
};

// Get user's auto-gift calendar
const getAutoGiftCalendar = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const filter = { user: req.user._id };
        if (status) {
            filter.status = status;
        }

        const autoGifts = await AutoGiftCalendar.find(filter)
            .populate('selectedGifts.product')
            .populate('giftPreferences.aiSuggestions')
            .sort({ occasionDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await AutoGiftCalendar.countDocuments(filter);

        res.json({
            success: true,
            data: {
                autoGifts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching auto-gift calendar',
            error: error.message
        });
    }
};

// Get upcoming auto-gifts
const getUpcomingAutoGifts = async (req, res) => {
    try {
        const currentDate = new Date();
        const thirtyDaysLater = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        const upcomingGifts = await AutoGiftCalendar.find({
            user: req.user._id,
            status: 'active',
            occasionDate: {
                $gte: currentDate,
                $lte: thirtyDaysLater
            }
        })
        .populate('selectedGifts.product')
        .sort({ occasionDate: 1 });

        res.json({
            success: true,
            data: upcomingGifts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming gifts',
            error: error.message
        });
    }
};

// Get auto-gift details
const getAutoGiftDetails = async (req, res) => {
    try {
        const { autoGiftId } = req.params;

        const autoGift = await AutoGiftCalendar.findById(autoGiftId)
            .populate('selectedGifts.product')
            .populate('selectedGifts.customization')
            .populate('giftPreferences.aiSuggestions');

        if (!autoGift) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gift not found'
            });
        }

        // Check authorization
        if (autoGift.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this auto-gift'
            });
        }

        res.json({
            success: true,
            data: autoGift
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching auto-gift details',
            error: error.message
        });
    }
};

// Update auto-gift
const updateAutoGift = async (req, res) => {
    try {
        const { autoGiftId } = req.params;
        const updates = req.body;

        const autoGift = await AutoGiftCalendar.findById(autoGiftId);

        if (!autoGift) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gift not found'
            });
        }

        // Check authorization
        if (autoGift.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this auto-gift'
            });
        }

        // Prevent updates if already ordered
        if (autoGift.orderStatus === 'ordered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update auto-gift after order is placed'
            });
        }

        Object.assign(autoGift, updates);
        await autoGift.save();

        res.json({
            success: true,
            message: 'Auto-gift updated successfully',
            data: autoGift
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating auto-gift',
            error: error.message
        });
    }
};

// Update delivery address
const updateDeliveryAddress = async (req, res) => {
    try {
        const { autoGiftId } = req.params;
        const { deliveryAddress } = req.body;

        const autoGift = await AutoGiftCalendar.findById(autoGiftId);

        if (!autoGift) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gift not found'
            });
        }

        // Check authorization
        if (autoGift.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this auto-gift'
            });
        }

        autoGift.deliveryAddress = deliveryAddress;
        await autoGift.save();

        res.json({
            success: true,
            message: 'Delivery address updated successfully',
            data: autoGift
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating delivery address',
            error: error.message
        });
    }
};

// Get AI gift suggestions for auto-gift
const getAIGiftSuggestions = async (req, res) => {
    try {
        const { autoGiftId } = req.params;

        const autoGift = await AutoGiftCalendar.findById(autoGiftId);

        if (!autoGift) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gift not found'
            });
        }

        // Check authorization
        if (autoGift.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Create description for AI analysis
        const description = `Gift for ${autoGift.recipient.name}, ${autoGift.recipient.relationship}, for ${autoGift.occasion}. Budget: ${autoGift.giftPreferences.budget?.min || 0}-${autoGift.giftPreferences.budget?.max || 'unlimited'}. Interests: ${autoGift.giftPreferences.interests?.join(', ') || 'not specified'}`;

        // Get AI suggestions
        const analysis = await giftMindReader.analyzePersonDescription(description);
        
        // Get products based on analysis
        const Product = require('../models/Product');
        const suggestedProducts = await Product.find({
            isActive: true,
            pricing: {
                $gte: autoGift.giftPreferences.budget?.min || 0,
                $lte: autoGift.giftPreferences.budget?.max || 10000
            }
        })
        .limit(10);

        // Update auto-gift with suggestions
        autoGift.giftPreferences.aiSuggestions = suggestedProducts.map(p => p._id);
        await autoGift.save();

        res.json({
            success: true,
            data: {
                analysis,
                suggestions: suggestedProducts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting AI suggestions',
            error: error.message
        });
    }
};

// Select gifts for auto-gift
const selectGifts = async (req, res) => {
    try {
        const { autoGiftId } = req.params;
        const { selectedGifts } = req.body;

        const autoGift = await AutoGiftCalendar.findById(autoGiftId);

        if (!autoGift) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gift not found'
            });
        }

        // Check authorization
        if (autoGift.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        autoGift.selectedGifts = selectedGifts;
        await autoGift.save();

        res.json({
            success: true,
            message: 'Gifts selected successfully',
            data: autoGift
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error selecting gifts',
            error: error.message
        });
    }
};

// Cancel auto-gift
const cancelAutoGift = async (req, res) => {
    try {
        const { autoGiftId } = req.params;

        const autoGift = await AutoGiftCalendar.findById(autoGiftId);

        if (!autoGift) {
            return res.status(404).json({
                success: false,
                message: 'Auto-gift not found'
            });
        }

        // Check authorization
        if (autoGift.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Prevent cancellation if already ordered
        if (autoGift.orderStatus === 'ordered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel auto-gift after order is placed'
            });
        }

        autoGift.status = 'cancelled';
        await autoGift.save();

        res.json({
            success: true,
            message: 'Auto-gift cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cancelling auto-gift',
            error: error.message
        });
    }
};

// Get delivery estimation based on pincode
const getDeliveryEstimation = async (req, res) => {
    try {
        const { pincode } = req.query;

        if (!pincode || pincode.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pincode'
            });
        }

        // Calculate estimated days based on pincode
        const regionCode = pincode.substring(0, 3);
        let estimatedDays = 5;
        let region = 'Other areas';

        if (['110', '100', '001'].includes(regionCode)) {
            estimatedDays = 2;
            region = 'Metro cities (Delhi NCR)';
        } else if (['400', '500', '600'].includes(regionCode)) {
            estimatedDays = 3;
            region = 'Major cities (Mumbai, Hyderabad, Chennai)';
        } else if (['560', '700', '380'].includes(regionCode)) {
            estimatedDays = 4;
            region = 'Tier-1 cities (Bangalore, Kolkata, Ahmedabad)';
        }

        res.json({
            success: true,
            data: {
                pincode,
                region,
                estimatedDays,
                requiredDaysBefore: estimatedDays + 2,
                message: `Estimated delivery time: ${estimatedDays} days. Order should be placed at least ${estimatedDays + 2} days before the occasion.`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error calculating delivery estimation',
            error: error.message
        });
    }
};

module.exports = {
    createAutoGift,
    getAutoGiftCalendar,
    getUpcomingAutoGifts,
    getAutoGiftDetails,
    updateAutoGift,
    updateDeliveryAddress,
    getAIGiftSuggestions,
    selectGifts,
    cancelAutoGift,
    getDeliveryEstimation
};
