const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Grievance = require('../models/Grievance');
const Coupon = require('../models/Coupon');
const AutoGiftCalendar = require('../models/AutoGiftCalendar');
const AdminWallet = require('../models/AdminWallet');
const AdminNotification = require('../models/AdminNotification');
const Return = require('../models/Return');
const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');
const OrderTracking = require('../models/OrderTracking');
const { emitOrderStatusChange } = require('../services/socket');
const { sendEmail } = require('../services/emailService');

const PLATFORM_COMMISSION_RATE = 4; // 4% on every order

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalSellers,
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingGrievances,
            activeCoupons
        ] = await Promise.all([
            User.countDocuments(),
            Seller.countDocuments({ isVerified: true }),
            Product.countDocuments({ isActive: true }),
            Order.countDocuments(),
            Order.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Grievance.countDocuments({ status: 'open' }),
            Coupon.countDocuments({ isActive: true })
        ]);

        const revenue = totalRevenue[0]?.total || 0;

        // Get recent orders
        const recentOrders = await Order.find()
            .populate('buyer', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        // Get recent sellers
        const recentSellers = await Seller.find()
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalSellers,
                    totalProducts,
                    totalOrders,
                    totalRevenue: revenue,
                    pendingGrievances,
                    activeCoupons
                },
                recentOrders,
                recentSellers
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats',
            error: error.message
        });
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (status === 'active') {
            filter.isActive = true;
        } else if (status === 'inactive') {
            filter.isActive = false;
        }

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: {
                users,
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
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Get all sellers
const getAllSellers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, verificationStatus } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { businessName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (verificationStatus) {
            filter.verificationStatus = verificationStatus;
        }

        const sellers = await Seller.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Seller.countDocuments(filter);

        res.json({
            success: true,
            data: {
                sellers,
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
            message: 'Error fetching sellers',
            error: error.message
        });
    }
};

// Verify seller
const verifySeller = async (req, res) => {
    try {
        const { sellerId } = req.params;

        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { verificationStatus: 'verified', isVerified: true },
            { new: true }
        );

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        res.json({
            success: true,
            message: 'Seller verified successfully',
            data: seller
        });

        // Notify Seller via Email
        await sendEmail({
            email: seller.email,
            subject: 'Congratulations! Your Artisan Account is Verified - GiftKart',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #8b5cf6;">Welcome to the Artisan Community!</h2>
                    <p>Hello ${seller.ownerName},</p>
                    <p>We are thrilled to inform you that your seller account for <b>${seller.businessName}</b> has been verified by our team.</p>
                    <p>You can now start listing your premium products and reaching thousands of gift-seekers on our platform.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.CLIENT_URL}/seller-login" style="background: #8b5cf6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                    <p>Happy Gifting!</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0;" />
                    <p style="font-size: 0.8rem; color: #94a3b8;">GiftKart Team</p>
                </div>
            `
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verifying seller',
            error: error.message
        });
    }
};

// Suspend seller
const suspendSeller = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { reason } = req.body;

        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { isSuspended: true, suspensionReason: reason },
            { new: true }
        );

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        res.json({
            success: true,
            message: 'Seller suspended successfully',
            data: seller
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error suspending seller',
            error: error.message
        });
    }
};

// Get all orders
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate } = req.query;

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const orders = await Order.find(filter)
            .populate('buyer', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: {
                orders,
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
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Get all grievances
const getAllGrievances = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, category } = req.query;

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (category) {
            filter.category = category;
        }

        const grievances = await Grievance.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Grievance.countDocuments(filter);

        res.json({
            success: true,
            data: {
                grievances,
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
            message: 'Error fetching grievances',
            error: error.message
        });
    }
};

// Resolve grievance
const resolveGrievance = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { resolution, resolutionNotes } = req.body;

        const grievance = await Grievance.findByIdAndUpdate(
            grievanceId,
            {
                status: 'resolved',
                resolution,
                resolutionNotes,
                resolvedAt: Date.now(),
                resolvedBy: req.user._id
            },
            { new: true }
        );

        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found'
            });
        }

        res.json({
            success: true,
            message: 'Grievance resolved successfully',
            data: grievance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error resolving grievance',
            error: error.message
        });
    }
};

// Get platform analytics
const getPlatformAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        } else if (period === '1y') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const [
            periodOrders,
            periodRevenue,
            newUsers,
            newSellers
        ] = await Promise.all([
            Order.countDocuments({ createdAt: { $gte: startDate } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            User.countDocuments({ createdAt: { $gte: startDate } }),
            Seller.countDocuments({ createdAt: { $gte: startDate } })
        ]);

        const revenue = periodRevenue[0]?.total || 0;

        // Top performing categories
        const topCategories = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: '$products' },
            { $lookup: { from: 'products', localField: 'products.product', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' },
            { $group: { _id: '$product.category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                period: {
                    orders: periodOrders,
                    revenue,
                    newUsers,
                    newSellers
                },
                topCategories
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics',
            error: error.message
        });
    }
};

// Update system settings
const updateSystemSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        // In production, store in a dedicated Settings model
        // For now, just return success
        res.json({
            success: true,
            message: 'System settings updated',
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating settings',
            error: error.message
        });
    }
};

// ─── Admin Notifications ───────────────────────────────────────

const getAdminNotifications = async (req, res) => {
    try {
        const { unreadOnly } = req.query;
        const filter = unreadOnly === 'true' ? { isRead: false } : {};
        const notifications = await AdminNotification.find(filter)
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await AdminNotification.countDocuments({ isRead: false });
        res.json({ success: true, data: { notifications, unreadCount } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        if (notificationId === 'all') {
            await AdminNotification.updateMany({}, { isRead: true });
        } else {
            await AdminNotification.findByIdAndUpdate(notificationId, { isRead: true });
        }
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error marking notification', error: error.message });
    }
};

// ─── Admin Wallet & Commission ────────────────────────────────

const getAdminWallet = async (req, res) => {
    try {
        let wallet = await AdminWallet.findOne();
        if (!wallet) wallet = await AdminWallet.create({});
        res.json({ success: true, data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching admin wallet', error: error.message });
    }
};

const recordCommission = async (req, res) => {
    try {
        const { orderId, orderAmount, sellerId } = req.body;
        const commissionAmount = Math.round((orderAmount * PLATFORM_COMMISSION_RATE) / 100);

        let wallet = await AdminWallet.findOne();
        if (!wallet) wallet = await AdminWallet.create({});

        wallet.totalCommissionEarned += commissionAmount;
        wallet.availableBalance += commissionAmount;
        wallet.transactions.push({
            orderId, sellerId, orderAmount,
            commissionRate: PLATFORM_COMMISSION_RATE,
            commissionAmount,
            type: 'commission',
            description: `4% commission on order #${orderId?.toString().slice(-6).toUpperCase()}`
        });
        await wallet.save();

        res.json({ success: true, data: { commissionAmount, wallet } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error recording commission', error: error.message });
    }
};

// ─── Order Status / Transportation ───────────────────────────

const ORDER_STATUS_FLOW = [
    'pending', 'confirmed', 'processing', 'quality_check',
    'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
];

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingNumber, note } = req.body;

        const validStatuses = [
            'pending', 'confirmed', 'paid', 'processing',
            'quality_check', 'packed', 'shipped',
            'out_for_delivery', 'delivered',
            'failed', 'refunded', 'cancelled'
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
            });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const previousStatus = order.status;

        // Build update object
        const updateData = { status, updatedAt: new Date() };
        if (trackingNumber) updateData.trackingNumber = trackingNumber;

        const historyEntry = {
            status,
            note: note || `Status updated to "${status}" by admin`,
            updatedBy: 'admin',
            updatedAt: new Date()
        };

        // Use direct update to avoid pre-save hook interference
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                $set: updateData,
                $push: { statusHistory: historyEntry }
            },
            { new: true, runValidators: true }
        );

        // Auto-record 4% commission and credit seller when order is delivered
        if (status === 'delivered' && previousStatus !== 'delivered') {
            try {
                // Fetch full order with product details
                const populatedOrder = await Order.findById(orderId).populate('products.product');
                if (!populatedOrder) throw new Error('Order not found for processing');

                let totalOrderCommission = 0;

                for (const item of populatedOrder.products) {
                    const product = item.product;
                    if (!product) continue;

                    const itemTotal = item.price * item.quantity;
                    // Calculate 4% platform commission
                    const commissionAmount = Math.round((itemTotal * PLATFORM_COMMISSION_RATE) / 100);
                    const creatorEarnings = itemTotal - commissionAmount;
                    
                    totalOrderCommission += commissionAmount;

                    if (product.creator) {
                        // 1. Update Seller model (Primary wallet and stats)
                        await Seller.findByIdAndUpdate(product.creator, {
                            $inc: {
                                'wallet.balance': creatorEarnings,
                                'wallet.totalEarned': creatorEarnings,
                                'stats.totalRevenue': creatorEarnings,
                                'stats.totalOrders': item.quantity
                            }
                        });

                        // 2. Update Product popularity
                        await Product.findByIdAndUpdate(product._id, {
                            $inc: { 'popularity.orders': item.quantity }
                        });

                        // 3. Update CreatorDashboard earnings
                        const CreatorDashboard = require('../models/CreatorDashboard');
                        await CreatorDashboard.findOneAndUpdate(
                            { creator: product.creator },
                            { 
                                $inc: { 
                                    'earnings.total': creatorEarnings,
                                    'earnings.available': creatorEarnings,
                                    'performance.completedOrders': 1
                                },
                                $set: { lastUpdated: new Date() }
                            },
                            { upsert: true }
                        );

                        // Create transaction record for seller
                        await Transaction.create({
                            seller: product.creator,
                            type: 'deposit',
                            amount: creatorEarnings,
                            status: 'completed',
                            description: `Earnings from Order #${order._id.toString().slice(-6).toUpperCase()}`,
                            orderId: order._id
                        });

                        // 4. Also credit the global User Wallet (if it exists for the seller's user account)
                        // This allows the seller to withdraw money from their main profile
                        const sellerDoc = await Seller.findById(product.creator);
                        if (sellerDoc && sellerDoc.email) {
                            const userDoc = await User.findOne({ email: sellerDoc.email });
                            if (userDoc) {
                                await Wallet.findOneAndUpdate(
                                    { user: userDoc._id },
                                    { $inc: { balance: creatorEarnings } },
                                    { upsert: true }
                                );
                                
                                // Record transaction for the seller
                                await Transaction.create({
                                    user: userDoc._id,
                                    type: 'earnings',
                                    amount: creatorEarnings,
                                    status: 'completed',
                                    description: `Earnings from order #${orderId.toString().slice(-6).toUpperCase()}`,
                                    orderId: orderId
                                });
                            }
                        }
                    }
                }
                
                // 5. Credit Admin Wallet with total commission from this order
                if (totalOrderCommission > 0) {
                    let adminWallet = await AdminWallet.findOne();
                    if (!adminWallet) adminWallet = await AdminWallet.create({});
                    
                    adminWallet.totalCommissionEarned += totalOrderCommission;
                    adminWallet.availableBalance += totalOrderCommission;
                    adminWallet.transactions.push({
                        orderId: populatedOrder._id,
                        orderAmount: populatedOrder.amount,
                        commissionRate: PLATFORM_COMMISSION_RATE,
                        commissionAmount: totalOrderCommission,
                        type: 'commission',
                        description: `4% commission on delivered order #${orderId.toString().slice(-6).toUpperCase()}`
                    });
                    await adminWallet.save();
                }

            } catch (commErr) {
                console.error('Commission/Seller wallet crediting failed:', commErr);
            }
        }

        // ─── Update OrderTracking ────────────────────────────────
        try {
            let tracking = await OrderTracking.findOne({ order: orderId });
            if (!tracking) {
                tracking = new OrderTracking({
                    order: orderId,
                    deliveryAddress: {
                        name: order.shippingAddress?.name || 'Customer',
                        phone: order.shippingAddress?.phone || '',
                        address: `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}`,
                        city: order.shippingAddress?.city || '',
                        state: order.shippingAddress?.state || '',
                        pincode: order.shippingAddress?.pincode || ''
                    }
                });
            }

            // Map order status to tracking stage if they differ
            const stageMapping = {
                'paid': 'confirmed',
                'processing': 'processing',
                'shipped': 'shipped',
                'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered',
                'cancelled': 'cancelled'
            };

            const trackingStage = stageMapping[status] || status;
            
            await tracking.addTrackingEvent(
                trackingStage,
                req.body.location || 'Central Hub',
                note || `Order status updated to ${status}`
            );

            // Emit Real-time Socket Notification
            emitOrderStatusChange(orderId, status, {
                description: note || `Your order is now ${status}`,
                timestamp: new Date()
            });

        } catch (trackErr) {
            console.error('Failed to sync OrderTracking:', trackErr);
        }

        res.json({
            success: true,
            message: `Order status updated to "${status}"`,
            data: { orderId, previousStatus, newStatus: status }
        });
    } catch (error) {
        console.error('updateOrderStatus error:', error);
        res.status(500).json({ success: false, message: 'Error updating order status', error: error.message });
    }
};

// ─── Reject Seller ────────────────────────────────────────────

const rejectSeller = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { reason } = req.body;
        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { verificationStatus: 'rejected', isVerified: false, rejectionReason: reason || 'Did not meet platform requirements' },
            { new: true }
        );
        if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
        res.json({ success: true, message: 'Seller rejected', data: seller });

        // Notify Seller via Email
        await sendEmail({
            email: seller.email,
            subject: 'Update regarding your Seller Application - GiftKart',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #ef4444;">Seller Application Update</h2>
                    <p>Hello ${seller.ownerName},</p>
                    <p>Thank you for your interest in joining GiftKart. After reviewing your application for <b>${seller.businessName}</b>, we regret to inform you that we cannot approve it at this time.</p>
                    <p><b>Reason:</b> ${reason || 'Application did not meet our current requirements.'}</p>
                    <p>If you believe this was an error or have updated your documents, you can contact our support team.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0;" />
                    <p style="font-size: 0.8rem; color: #94a3b8;">GiftKart Support Team</p>
                </div>
            `
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error rejecting seller', error: error.message });
    }
};

// ─── Block / Unblock User ────────────────────────────────────

const blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        // Prevent admin from blocking themselves
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Cannot block another admin.' });
        }

        await User.findByIdAndUpdate(userId, {
            isBlocked: true,
            blockedAt: new Date(),
            blockReason: reason || 'Violated platform terms of service'
        });

        res.json({ success: true, message: `User "${user.displayName}" has been blocked.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error blocking user', error: error.message });
    }
};

const unblockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await User.findByIdAndUpdate(userId, {
            isBlocked: false,
            blockedAt: null,
            blockReason: null
        });

        res.json({ success: true, message: `User "${user.displayName}" has been unblocked.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error unblocking user', error: error.message });
    }
};


// ─── Admin Withdrawals ───────────────────────────────────────

const getAllWithdrawals = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const withdrawals = await Withdrawal.find(filter)
            .populate('user', 'displayName email role')
            .populate('seller', 'businessName ownerName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Withdrawal.countDocuments(filter);

        res.json({
            success: true,
            data: {
                withdrawals,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    page: parseInt(page)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateWithdrawalStatus = async (req, res) => {
    try {
        const { withdrawalId } = req.params;
        const { status, adminNote } = req.body;

        const withdrawal = await Withdrawal.findById(withdrawalId);

        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
        }

        if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
            return res.status(400).json({ success: false, message: `Cannot update withdrawal from status ${withdrawal.status}` });
        }

        withdrawal.status = status;
        if (adminNote) withdrawal.adminNote = adminNote;
        await withdrawal.save();

        // If completed, update the transaction
        if (status === 'completed' && withdrawal.transactionId) {
            await Transaction.findByIdAndUpdate(withdrawal.transactionId, { status: 'completed' });
        }

        // If rejected, refund the wallet balance
        if (status === 'rejected') {
            if (withdrawal.seller) {
                await Seller.findByIdAndUpdate(withdrawal.seller, {
                    $inc: { 'wallet.balance': withdrawal.amount, 'wallet.pendingWithdrawals': -withdrawal.amount }
                });
            } else if (withdrawal.user) {
                await Wallet.findOneAndUpdate({ user: withdrawal.user }, {
                    $inc: { balance: withdrawal.amount }
                });
            }
            
            if (withdrawal.transactionId) {
                await Transaction.findByIdAndUpdate(withdrawal.transactionId, { status: 'failed', description: 'Withdrawal rejected - Refunded' });
            }
        }

        res.json({ success: true, message: `Withdrawal ${status} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const adminWithdrawCommission = async (req, res) => {
    try {
        const { amount, bankDetails } = req.body;
        
        let wallet = await AdminWallet.findOne();
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Admin wallet not found' });
        }

        if (wallet.availableBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient commission balance' });
        }

        wallet.availableBalance -= amount;
        wallet.transactions.push({
            orderAmount: amount, 
            commissionAmount: amount,
            type: 'withdrawal',
            description: `Commission withdrawn to bank account (${bankDetails?.accountNumber?.slice(-4) || 'Unknown'})`,
            createdAt: new Date()
        });

        await wallet.save();

        res.json({ success: true, message: 'Commission withdrawn successfully', data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error withdrawing commission', error: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllSellers,
    verifySeller,
    suspendSeller,
    rejectSeller,
    getAllOrders,
    getAllGrievances,
    resolveGrievance,
    getPlatformAnalytics,
    updateSystemSettings,
    getAdminNotifications,
    markNotificationRead,
    getAdminWallet,
    recordCommission,
    updateOrderStatus,
    ORDER_STATUS_FLOW,
    blockUser,
    unblockUser,
    getAllWithdrawals,
    updateWithdrawalStatus,
    adminWithdrawCommission
};
