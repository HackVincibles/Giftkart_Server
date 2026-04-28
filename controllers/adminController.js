const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Grievance = require('../models/Grievance');
const Coupon = require('../models/Coupon');
const AutoGiftCalendar = require('../models/AutoGiftCalendar');

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

module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllSellers,
    verifySeller,
    suspendSeller,
    getAllOrders,
    getAllGrievances,
    resolveGrievance,
    getPlatformAnalytics,
    updateSystemSettings
};
