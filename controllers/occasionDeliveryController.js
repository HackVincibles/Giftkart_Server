const OccasionDelivery = require('../models/OccasionDelivery');
const Order = require('../models/Order');
const AutoGiftCalendar = require('../models/AutoGiftCalendar');

// Create occasion delivery
const createOccasionDelivery = async (req, res) => {
    try {
        const {
            occasion,
            customOccasion,
            preferredDeliveryDate,
            isFlexible,
            flexibleRange,
            preferredTimeSlot,
            specialHandling,
            handlingInstructions,
            giftWrap,
            giftWrapTheme,
            giftCardMessage,
            isSurprise,
            surpriseInstructions,
            orderId,
            autoGiftId
        } = req.body;

        const occasionDelivery = await OccasionDelivery.create({
            occasion,
            customOccasion,
            preferredDeliveryDate,
            isFlexible,
            flexibleRange,
            preferredTimeSlot,
            specialHandling,
            handlingInstructions,
            giftWrap,
            giftWrapTheme,
            giftCardMessage,
            isSurprise,
            surpriseInstructions,
            order: orderId,
            autoGift: autoGiftId,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Occasion delivery created',
            data: occasionDelivery
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating occasion delivery',
            error: error.message
        });
    }
};

// Get occasion delivery by order
const getOccasionDeliveryByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const occasionDelivery = await OccasionDelivery.findOne({ order: orderId })
            .populate('order')
            .populate('autoGift');

        if (!occasionDelivery) {
            return res.status(404).json({
                success: false,
                message: 'Occasion delivery not found'
            });
        }

        res.json({
            success: true,
            data: occasionDelivery
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching occasion delivery',
            error: error.message
        });
    }
};

// Get occasion delivery by auto-gift
const getOccasionDeliveryByAutoGift = async (req, res) => {
    try {
        const { autoGiftId } = req.params;

        const occasionDelivery = await OccasionDelivery.findOne({ autoGift: autoGiftId })
            .populate('autoGift');

        if (!occasionDelivery) {
            return res.status(404).json({
                success: false,
                message: 'Occasion delivery not found'
            });
        }

        res.json({
            success: true,
            data: occasionDelivery
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching occasion delivery',
            error: error.message
        });
    }
};

// Update occasion delivery
const updateOccasionDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const updates = req.body;

        const occasionDelivery = await OccasionDelivery.findById(deliveryId);

        if (!occasionDelivery) {
            return res.status(404).json({
                success: false,
                message: 'Occasion delivery not found'
            });
        }

        // Prevent updates if already delivered
        if (occasionDelivery.status === 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update delivered occasion'
            });
        }

        Object.assign(occasionDelivery, updates);
        await occasionDelivery.save();

        res.json({
            success: true,
            message: 'Occasion delivery updated',
            data: occasionDelivery
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating occasion delivery',
            error: error.message
        });
    }
};

// Record actual delivery
const recordActualDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const { actualDeliveryDate, actualTimeSlot, deliveryPhoto, recipientSignature } = req.body;

        const occasionDelivery = await OccasionDelivery.findById(deliveryId);

        if (!occasionDelivery) {
            return res.status(404).json({
                success: false,
                message: 'Occasion delivery not found'
            });
        }

        occasionDelivery.actualDeliveryDate = actualDeliveryDate || Date.now();
        occasionDelivery.actualTimeSlot = actualTimeSlot;
        occasionDelivery.deliveryPhoto = deliveryPhoto;
        occasionDelivery.recipientSignature = recipientSignature;
        occasionDelivery.status = 'delivered';

        // Check if delivery was on time
        const onTime = occasionDelivery.isOnTime();
        occasionDelivery.deliveryFeedback = {
            onTime,
            condition: 'recorded'
        };

        await occasionDelivery.save();

        res.json({
            success: true,
            message: 'Delivery recorded successfully',
            data: {
                occasionDelivery,
                onTime
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error recording delivery',
            error: error.message
        });
    }
};

// Submit delivery feedback
const submitDeliveryFeedback = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const { onTime, condition, rating, comments } = req.body;

        const occasionDelivery = await OccasionDelivery.findById(deliveryId);

        if (!occasionDelivery) {
            return res.status(404).json({
                success: false,
                message: 'Occasion delivery not found'
            });
        }

        occasionDelivery.deliveryFeedback = {
            onTime,
            condition,
            rating,
            comments
        };

        await occasionDelivery.save();

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: occasionDelivery
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: error.message
        });
    }
};

// Get upcoming occasion deliveries
const getUpcomingDeliveries = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const currentDate = new Date();
        const futureDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);

        const deliveries = await OccasionDelivery.find({
            preferredDeliveryDate: {
                $gte: currentDate,
                $lte: futureDate
            },
            status: { $in: ['pending', 'scheduled'] }
        })
        .populate('order')
        .populate('autoGift')
        .sort({ preferredDeliveryDate: 1 });

        res.json({
            success: true,
            data: deliveries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming deliveries',
            error: error.message
        });
    }
};

// Reschedule occasion delivery
const rescheduleDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const { newDeliveryDate, reason } = req.body;

        const occasionDelivery = await OccasionDelivery.findById(deliveryId);

        if (!occasionDelivery) {
            return res.status(404).json({
                success: false,
                message: 'Occasion delivery not found'
            });
        }

        // Check if can be rescheduled
        if (occasionDelivery.status === 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot reschedule delivered occasion'
            });
        }

        occasionDelivery.preferredDeliveryDate = newDeliveryDate;
        occasionDelivery.status = 'rescheduled';
        await occasionDelivery.save();

        res.json({
            success: true,
            message: 'Delivery rescheduled successfully',
            data: occasionDelivery
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error rescheduling delivery',
            error: error.message
        });
    }
};

// Get occasion-specific delivery requirements
const getOccasionRequirements = async (req, res) => {
    try {
        const { occasion } = req.params;

        const requirements = {
            birthday: {
                recommendedDeliveryWindow: 'Same day',
                preferredTimeSlots: ['morning_9_12', 'evening_6_9'],
                specialHandling: 'standard',
                giftWrapRecommended: true,
                messageCardRecommended: true
            },
            anniversary: {
                recommendedDeliveryWindow: 'Same day',
                preferredTimeSlots: ['evening_6_9'],
                specialHandling: 'standard',
                giftWrapRecommended: true,
                messageCardRecommended: true
            },
            wedding: {
                recommendedDeliveryWindow: '1-2 days before',
                preferredTimeSlots: ['morning_9_12'],
                specialHandling: 'fragile',
                giftWrapRecommended: true,
                messageCardRecommended: true
            },
            diwali: {
                recommendedDeliveryWindow: '1-2 days before',
                preferredTimeSlots: ['anytime'],
                specialHandling: 'standard',
                giftWrapRecommended: true,
                messageCardRecommended: true
            },
            christmas: {
                recommendedDeliveryWindow: '1-2 days before',
                preferredTimeSlots: ['morning_9_12'],
                specialHandling: 'standard',
                giftWrapRecommended: true,
                messageCardRecommended: true
            },
            valentine: {
                recommendedDeliveryWindow: 'Same day',
                preferredTimeSlots: ['evening_6_9'],
                specialHandling: 'fragile',
                giftWrapRecommended: true,
                messageCardRecommended: true
            }
        };

        const occasionRequirements = requirements[occasion] || requirements.birthday;

        res.json({
            success: true,
            data: occasionRequirements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching requirements',
            error: error.message
        });
    }
};

module.exports = {
    createOccasionDelivery,
    getOccasionDeliveryByOrder,
    getOccasionDeliveryByAutoGift,
    updateOccasionDelivery,
    recordActualDelivery,
    submitDeliveryFeedback,
    getUpcomingDeliveries,
    rescheduleDelivery,
    getOccasionRequirements
};
