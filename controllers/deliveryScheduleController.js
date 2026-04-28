const DeliverySchedule = require('../models/DeliverySchedule');
const Order = require('../models/Order');

// Create delivery schedule
const createDeliverySchedule = async (req, res) => {
    try {
        const {
            orderId,
            preferredDeliveryDate,
            preferredTimeSlot,
            deliveryAddress,
            specialInstructions,
            giftMessage,
            giftWrap,
            giftWrapType,
            occasion,
            recipientName
        } = req.body;

        // Check if order exists and belongs to user
        const order = await Order.findOne({ _id: orderId, user: req.user._id });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if schedule already exists
        const existingSchedule = await DeliverySchedule.findOne({ order: orderId });
        if (existingSchedule) {
            return res.status(400).json({
                success: false,
                message: 'Delivery schedule already exists for this order'
            });
        }

        // Validate delivery date (must be at least 2 days in future)
        const minDeliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const requestedDate = new Date(preferredDeliveryDate);
        if (requestedDate < minDeliveryDate) {
            return res.status(400).json({
                success: false,
                message: 'Delivery date must be at least 2 days in advance'
            });
        }

        const schedule = await DeliverySchedule.create({
            order: orderId,
            preferredDeliveryDate,
            preferredTimeSlot,
            deliveryAddress: deliveryAddress || order.shippingAddress,
            specialInstructions,
            giftMessage,
            giftWrap,
            giftWrapType,
            occasion,
            recipientName,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Delivery schedule created successfully',
            data: schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating delivery schedule',
            error: error.message
        });
    }
};

// Get delivery schedule for order
const getDeliverySchedule = async (req, res) => {
    try {
        const { orderId } = req.params;

        const schedule = await DeliverySchedule.findOne({ order: orderId })
            .populate('order');

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Delivery schedule not found'
            });
        }

        // Check authorization
        if (schedule.order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this schedule'
            });
        }

        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching delivery schedule',
            error: error.message
        });
    }
};

// Update delivery schedule
const updateDeliverySchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const updates = req.body;

        const schedule = await DeliverySchedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Delivery schedule not found'
            });
        }

        // Check authorization
        const order = await Order.findById(schedule.order);
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this schedule'
            });
        }

        // Prevent updates if already confirmed
        if (schedule.status === 'confirmed' || schedule.status === 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update schedule after confirmation'
            });
        }

        Object.assign(schedule, updates);
        await schedule.save();

        res.json({
            success: true,
            message: 'Delivery schedule updated successfully',
            data: schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating delivery schedule',
            error: error.message
        });
    }
};

// Request reschedule
const requestReschedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { requestedDate, requestedTimeSlot, reason } = req.body;

        const schedule = await DeliverySchedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Delivery schedule not found'
            });
        }

        // Check authorization
        const order = await Order.findById(schedule.order);
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Validate new date
        const minDeliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const requestedDateObj = new Date(requestedDate);
        if (requestedDateObj < minDeliveryDate) {
            return res.status(400).json({
                success: false,
                message: 'New delivery date must be at least 2 days in advance'
            });
        }

        schedule.rescheduleRequests.push({
            requestedDate: requestedDateObj,
            requestedTimeSlot,
            reason,
            requestedAt: Date.now(),
            status: 'pending'
        });

        await schedule.save();

        res.json({
            success: true,
            message: 'Reschedule request submitted',
            data: schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error requesting reschedule',
            error: error.message
        });
    }
};

// Confirm delivery schedule (for sellers/admin)
const confirmDeliverySchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;

        const schedule = await DeliverySchedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Delivery schedule not found'
            });
        }

        schedule.status = 'confirmed';
        schedule.confirmedAt = Date.now();
        schedule.confirmedBy = req.seller?._id || req.user._id;

        await schedule.save();

        res.json({
            success: true,
            message: 'Delivery schedule confirmed',
            data: schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error confirming schedule',
            error: error.message
        });
    }
};

// Get available time slots for a date
const getAvailableTimeSlots = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required'
            });
        }

        const requestedDate = new Date(date);
        const minDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

        if (requestedDate < minDate) {
            return res.status(400).json({
                success: false,
                message: 'Date must be at least 2 days in advance'
            });
        }

        // All time slots (in production, check availability)
        const timeSlots = [
            { value: 'morning_9_12', label: 'Morning (9 AM - 12 PM)', available: true },
            { value: 'afternoon_12_3', label: 'Afternoon (12 PM - 3 PM)', available: true },
            { value: 'evening_3_6', label: 'Evening (3 PM - 6 PM)', available: true },
            { value: 'evening_6_9', label: 'Evening (6 PM - 9 PM)', available: true }
        ];

        res.json({
            success: true,
            data: {
                date: requestedDate,
                timeSlots
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching time slots',
            error: error.message
        });
    }
};

// Record actual delivery
const recordActualDelivery = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { actualDeliveryDate, actualDeliveryTime, notes } = req.body;

        const schedule = await DeliverySchedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Delivery schedule not found'
            });
        }

        schedule.actualDeliveryDate = actualDeliveryDate || Date.now();
        schedule.actualDeliveryTime = actualDeliveryTime;
        schedule.deliveredAt = Date.now();
        schedule.status = 'completed';

        await schedule.save();

        res.json({
            success: true,
            message: 'Delivery recorded successfully',
            data: schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error recording delivery',
            error: error.message
        });
    }
};

module.exports = {
    createDeliverySchedule,
    getDeliverySchedule,
    updateDeliverySchedule,
    requestReschedule,
    confirmDeliverySchedule,
    getAvailableTimeSlots,
    recordActualDelivery
};
