const CreatorDashboard = require('../models/CreatorDashboard');
const Customization = require('../models/Customization');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const VibeConcept = require('../models/VibeConcept');

// Get or create creator dashboard
const getDashboard = async (req, res) => {
    try {
        let dashboard = await CreatorDashboard.findOne({ creator: req.user._id })
            .populate('orderQueue.order')
            .populate('orderQueue.customization')
            .populate('orderQueue.order.buyer', 'displayName email phoneNumber');

        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

        if (!dashboard) {
            dashboard = await CreatorDashboard.create({
                creator: req.user._id,
                orderQueue: [],
                earnings: { 
                    total: creator.wallet?.totalEarned || 0, 
                    pending: creator.wallet?.pendingWithdrawals || 0, 
                    available: creator.wallet?.balance || 0, 
                    withdrawn: 0 
                },
                performance: { 
                    totalOrders: creator.stats?.totalOrders || 0, 
                    completedOrders: creator.stats?.totalOrders || 0, 
                    averageRating: 5 
                },
                demandInsights: { trendingGiftTypes: [], upcomingOccasions: [], searchTerms: [] }
            });
        }

        // Fetch recent Vibe-Requests (Sent concepts that need a creator)
        const vibeRequests = await VibeConcept.find({ status: 'sent' })
            .populate('buyer', 'displayName avatar')
            .sort({ createdAt: -1 })
            .limit(10);

        // Fetch Artisan Masterpieces (Finalized designs)
        const masterpieces = await VibeConcept.find({ 
            'canvasState.previewUrl': { $exists: true, $ne: null }
        })
        .populate('buyer', 'displayName avatar')
        .sort({ updatedAt: -1 });

        const pendingOrders = (dashboard.orderQueue.filter(o => o.status === 'new' || o.status === 'in-progress').length) + vibeRequests.length;
        const totalEarnings = creator.wallet?.balance || 0;
        const totalOrdersSold = creator.stats?.totalOrders || 0;
        const totalOrdersAmount = creator.wallet?.totalEarned || 0;

        res.json({
            success: true,
            data: {
                ...dashboard.toObject(),
                pendingOrders,
                totalEarnings,
                totalOrdersSold,
                totalOrdersAmount,
                rating: 5, // Mock rating or pull from profile if added
                vibeRequests,
                masterpieces
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard',
            error: error.message
        });
    }
};

const requestPublication = async (req, res) => {
    try {
        const concept = await VibeConcept.findByIdAndUpdate(
            req.params.id,
            { status: 'pending_publication' },
            { new: true }
        );
        if (!concept) return res.status(404).json({ success: false, message: 'Masterpiece not found' });
        res.json({ success: true, message: 'Publication request sent to Seller!', data: concept });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const saveCanvasState = async (req, res) => {
    try {
        const { elements, previewUrl } = req.body;
        const concept = await VibeConcept.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    'canvasState.elements': elements,
                    'canvasState.previewUrl': previewUrl 
                },
                status: 'finalized' // Move to finalized instead of just 'realizing'
            },
            { new: true }
        );
        if (!concept) return res.status(404).json({ success: false, message: 'Concept not found' });
        res.json({ success: true, message: 'Design finalized successfully', data: concept });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get order queue for creator
const getOrderQueue = async (req, res) => {
    try {
        const { status } = req.query;
        
        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id })
            .populate({
                path: 'orderQueue.order',
                populate: [
                    { path: 'buyer', select: 'displayName email phoneNumber avatar' },
                    { path: 'products.product' }
                ]
            })
            .populate('orderQueue.customization');

        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        let orderQueue = dashboard.orderQueue;
        
        if (status) {
            orderQueue = orderQueue.filter(order => order.status === status);
        }

        // Sort by priority and deadline
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        orderQueue.sort((a, b) => {
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(a.deadline) - new Date(b.deadline);
        });

        res.json({
            success: true,
            count: orderQueue.length,
            data: orderQueue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching order queue',
            error: error.message
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderQueueId } = req.params;
        const { status, priority, notes, estimatedCompletionTime } = req.body;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        const orderItem = dashboard.orderQueue.id(orderQueueId);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order not found in queue'
            });
        }

        if (status) orderItem.status = status;
        if (priority) orderItem.priority = priority;
        if (notes) orderItem.creatorNotes = notes;
        if (estimatedCompletionTime) orderItem.estimatedCompletionTime = estimatedCompletionTime;

        if (status === 'in-progress' && !orderItem.startedAt) {
            orderItem.startedAt = new Date();
        }

        if (status === 'completed') {
            orderItem.completedAt = new Date();
            dashboard.performance.completedOrders += 1;
        }

        await dashboard.save();

        res.json({
            success: true,
            message: 'Order status updated',
            data: orderItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// Add tracking info
const addTrackingInfo = async (req, res) => {
    try {
        const { orderQueueId } = req.params;
        const { courierName, trackingNumber, estimatedDeliveryDate } = req.body;
        const OrderTracking = require('../models/OrderTracking');

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({ success: false, message: 'Dashboard not found' });
        }

        const orderItem = dashboard.orderQueue.id(orderQueueId);
        if (!orderItem) {
            return res.status(404).json({ success: false, message: 'Order not found in queue' });
        }

        // Update Order Status to 'shipped'
        orderItem.status = 'completed'; // For creator, it's completed once shipped
        await dashboard.save();

        // Update the main Order model
        const order = await Order.findById(orderItem.order);
        if (order) {
            order.deliveryStatus = 'shipped';
            await order.save();
        }

        // Update or Create OrderTracking
        const tracking = await OrderTracking.findOneAndUpdate(
            { order: orderItem.order },
            { 
                $set: { 
                    currentStage: 'shipped',
                    'courierDetails.courierName': courierName,
                    'courierDetails.trackingNumber': trackingNumber,
                    'courierDetails.estimatedDeliveryDate': estimatedDeliveryDate,
                    'courierDetails.shippedDate': new Date()
                },
                $push: {
                    trackingEvents: {
                        stage: 'shipped',
                        status: 'shipped',
                        location: 'Artisan Studio',
                        description: `Order has been handed over to ${courierName}. Tracking: ${trackingNumber}`,
                        timestamp: new Date()
                    }
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Tracking information added successfully',
            data: tracking
        });
    } catch (error) {
        console.error('Add Tracking Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding tracking info',
            error: error.message
        });
    }
};

// Get AI suggestions for order
const getOrderAISuggestions = async (req, res) => {
    try {
        const { orderQueueId } = req.params;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        const orderItem = dashboard.orderQueue.id(orderQueueId);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Generate AI suggestions based on order details
        const suggestions = {
            design: [],
            message: '',
            layout: '',
            confidence: 0.75
        };

        // Design suggestions based on customization type
        if (orderItem.userInputs?.customizationType === 'photo-upload') {
            suggestions.design.push('Consider centering the photo with a subtle border');
            suggestions.design.push('Add a complementary background color that matches the photo tones');
        }

        if (orderItem.userInputs?.customizationType === 'text-engraving') {
            suggestions.design.push('Use an elegant font for the engraved text');
            suggestions.design.push('Consider adding decorative elements around the text');
        }

        // Message suggestion
        if (orderItem.userInputs?.description) {
            suggestions.message = `Based on the customer's description: "${orderItem.userInputs.description}", consider adding a heartfelt personal message that complements this sentiment.`;
        }

        // Layout suggestion
        suggestions.layout = 'Arrange elements in a balanced composition, with the main focal point slightly off-center for visual interest.';

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting AI suggestions',
            error: error.message
        });
    }
};

// Get earnings summary
const getEarnings = async (req, res) => {
    try {
        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        res.json({
            success: true,
            data: {
                total: dashboard.earnings.total,
                pending: dashboard.earnings.pending,
                available: dashboard.earnings.available,
                withdrawn: dashboard.earnings.withdrawn,
                currency: dashboard.earnings.currency,
                monthlyBreakdown: dashboard.earnings.monthlyBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching earnings',
            error: error.message
        });
    }
};

// Request withdrawal
const requestWithdrawal = async (req, res) => {
    try {
        const { amount, method } = req.body;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        if (amount > dashboard.earnings.available) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient available balance'
            });
        }

        dashboard.earnings.available -= amount;
        dashboard.earnings.withdrawn += amount;
        dashboard.earnings.pending += amount;

        await dashboard.save();

        res.json({
            success: true,
            message: 'Withdrawal request submitted',
            data: {
                amount,
                method,
                status: 'pending',
                estimatedProcessingTime: '3-5 business days'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error requesting withdrawal',
            error: error.message
        });
    }
};

// Get demand insights
const getDemandInsights = async (req, res) => {
    try {
        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        // Generate real-time insights based on platform data
        const insights = {
            trendingGiftTypes: dashboard.demandInsights.trendingGiftTypes,
            upcomingOccasions: dashboard.demandInsights.upcomingOccasions,
            searchTerms: dashboard.demandInsights.searchTerms,
            pricePreferences: dashboard.demandInsights.pricePreferences,
            recommendations: []
        };

        // Add recommendations based on insights
        if (dashboard.demandInsights.trendingGiftTypes.length > 0) {
            const topTrend = dashboard.demandInsights.trendingGiftTypes[0];
            insights.recommendations.push(`Consider creating more ${topTrend.type} gifts - demand is up ${topTrend.growth}%`);
        }

        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching demand insights',
            error: error.message
        });
    }
};

// Get performance metrics
const getPerformance = async (req, res) => {
    try {
        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        res.json({
            success: true,
            data: dashboard.performance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching performance metrics',
            error: error.message
        });
    }
};

// Update AI design assistance settings
const updateAIAssistanceSettings = async (req, res) => {
    try {
        const { enabled, autoLayout, autoCaption, autoResize } = req.body;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        if (enabled !== undefined) dashboard.aiDesignAssistance.enabled = enabled;
        if (autoLayout !== undefined) dashboard.aiDesignAssistance.autoLayout = autoLayout;
        if (autoCaption !== undefined) dashboard.aiDesignAssistance.autoCaption = autoCaption;
        if (autoResize !== undefined) dashboard.aiDesignAssistance.autoResize = autoResize;

        await dashboard.save();

        res.json({
            success: true,
            message: 'AI assistance settings updated',
            data: dashboard.aiDesignAssistance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating AI assistance settings',
            error: error.message
        });
    }
};

// Get notifications
const getNotifications = async (req, res) => {
    try {
        const { unreadOnly } = req.query;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        let notifications = dashboard.notifications;
        
        if (unreadOnly === 'true') {
            notifications = notifications.filter(n => !n.read);
        }

        // Sort by date descending
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            count: notifications.length,
            unreadCount: dashboard.notifications.filter(n => !n.read).length,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        const notification = dashboard.notifications.id(notificationId);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notification.read = true;
        await dashboard.save();

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
};

// Update logistics settings
const updateLogisticsSettings = async (req, res) => {
    try {
        const { preferredRegions, pickupSchedule, deliveryPartners } = req.body;

        const dashboard = await CreatorDashboard.findOne({ creator: req.seller._id });
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }

        if (preferredRegions) dashboard.logistics.preferredRegions = preferredRegions;
        if (pickupSchedule) dashboard.logistics.pickupSchedule = pickupSchedule;
        if (deliveryPartners) dashboard.logistics.deliveryPartners = deliveryPartners;

        await dashboard.save();

        res.json({
            success: true,
            message: 'Logistics settings updated',
            data: dashboard.logistics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating logistics settings',
            error: error.message
        });
    }
};

const getVibeRequestById = async (req, res) => {
    try {
        const request = await VibeConcept.findById(req.params.id)
            .populate('buyer', 'displayName avatar');
        if (!request) return res.status(404).json({ success: false, message: 'Vibe request not found' });
        res.json({ success: true, data: request });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



module.exports = {
    getDashboard,
    requestPublication,
    getOrderQueue,
    updateOrderStatus,
    addTrackingInfo,
    getOrderAISuggestions,
    getEarnings,
    requestWithdrawal,
    getDemandInsights,
    getPerformance,
    updateAIAssistanceSettings,
    getNotifications,
    markNotificationRead,
    updateLogisticsSettings,
    getVibeRequestById,
    saveCanvasState
};
