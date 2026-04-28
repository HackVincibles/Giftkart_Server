const OrderTracking = require('../models/OrderTracking');
const Order = require('../models/Order');

// Get order tracking
const getOrderTracking = async (req, res) => {
    try {
        const { orderId } = req.params;

        const tracking = await OrderTracking.findOne({ order: orderId })
            .populate('order');

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking information not found'
            });
        }

        // Check authorization
        if (tracking.order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this tracking'
            });
        }

        res.json({
            success: true,
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching tracking',
            error: error.message
        });
    }
};

// Update tracking stage (for sellers/admin)
const updateTrackingStage = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { stage, location, description, metadata } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        // Add tracking event
        await tracking.addTrackingEvent(stage, location, description, metadata);

        res.json({
            success: true,
            message: 'Tracking updated successfully',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating tracking',
            error: error.message
        });
    }
};

// Add courier details
const addCourierDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { courierName, trackingNumber, trackingUrl, estimatedDeliveryDate, deliveryTimeSlot } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        tracking.courierDetails = {
            courierName,
            trackingNumber,
            trackingUrl,
            estimatedDeliveryDate,
            deliveryTimeSlot,
            shippedDate: Date.now()
        };

        // Update stage to handed_to_courier
        await tracking.addTrackingEvent('handed_to_courier', 'Courier Hub', 'Package handed to courier');

        res.json({
            success: true,
            message: 'Courier details added successfully',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding courier details',
            error: error.message
        });
    }
};

// Update current location
const updateCurrentLocation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { latitude, longitude, accuracy } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        tracking.currentLocation = {
            latitude,
            longitude,
            lastUpdated: Date.now(),
            accuracy: accuracy || 10
        };

        await tracking.save();

        res.json({
            success: true,
            message: 'Location updated successfully',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating location',
            error: error.message
        });
    }
};

// Record delivery attempt
const recordDeliveryAttempt = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, reason, nextAttemptDate } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        tracking.deliveryAttempts.push({
            attemptDate: Date.now(),
            status,
            reason,
            nextAttemptDate
        });

        if (status === 'delivered') {
            tracking.currentStage = 'delivered';
            tracking.courierDetails.actualDeliveryDate = Date.now();
        } else if (status === 'failed') {
            tracking.currentStage = 'delivery_attempted';
        }

        await tracking.save();

        res.json({
            success: true,
            message: 'Delivery attempt recorded',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error recording delivery attempt',
            error: error.message
        });
    }
};

// Submit delivery proof
const submitDeliveryProof = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { signature, photo, deliveredTo, relationship } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        tracking.deliveryProof = {
            signature,
            photo,
            deliveredTo,
            relationship,
            timestamp: Date.now()
        };

        tracking.currentStage = 'delivered';
        tracking.courierDetails.actualDeliveryDate = Date.now();

        await tracking.save();

        res.json({
            success: true,
            message: 'Delivery proof submitted',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting delivery proof',
            error: error.message
        });
    }
};

// Report issue
const reportIssue = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { type, description } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        tracking.issues.push({
            type,
            description,
            reportedAt: Date.now(),
            resolved: false
        });

        await tracking.save();

        res.json({
            success: true,
            message: 'Issue reported successfully',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error reporting issue',
            error: error.message
        });
    }
};

// Submit customer feedback
const submitFeedback = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { rating, comments } = req.body;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        tracking.customerFeedback = {
            rating,
            comments,
            submittedAt: Date.now()
        };

        await tracking.save();

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: tracking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: error.message
        });
    }
};

// Get tracking timeline
const getTrackingTimeline = async (req, res) => {
    try {
        const { orderId } = req.params;

        const tracking = await OrderTracking.findOne({ order: orderId });

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Tracking not found'
            });
        }

        res.json({
            success: true,
            data: {
                currentStage: tracking.currentStage,
                timeline: tracking.trackingEvents,
                eta: tracking.eta,
                courierDetails: tracking.courierDetails,
                currentLocation: tracking.currentLocation
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching timeline',
            error: error.message
        });
    }
};

module.exports = {
    getOrderTracking,
    updateTrackingStage,
    addCourierDetails,
    updateCurrentLocation,
    recordDeliveryAttempt,
    submitDeliveryProof,
    reportIssue,
    submitFeedback,
    getTrackingTimeline
};
