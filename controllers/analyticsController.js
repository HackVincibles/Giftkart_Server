const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Transaction = require('../models/Transaction');

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;

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

        // Sales over time
        const salesOverTime = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'week' ? '%Y-%U' : '%Y-%m',
                            date: '$createdAt'
                        }
                    },
                    totalSales: { $sum: '$amount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total revenue
        const totalRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Average order value
        const avgOrderValue = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
            { $group: { _id: null, avg: { $avg: '$amount' } } }
        ]);

        res.json({
            success: true,
            data: {
                salesOverTime,
                totalRevenue: totalRevenue[0]?.total || 0,
                avgOrderValue: avgOrderValue[0]?.avg || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sales analytics',
            error: error.message
        });
    }
};

// Get product analytics
const getProductAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        }

        // Top selling products
        const topProducts = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' }
        ]);

        // Category performance
        const categoryPerformance = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
            { $unwind: '$products' },
            { $lookup: { from: 'products', localField: 'products.product', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.category',
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                topProducts,
                categoryPerformance
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching product analytics',
            error: error.message
        });
    }
};

// Get user analytics
const getUserAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        }

        // New users over time
        const newUsersOverTime = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total users
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });

        // User retention (simplified - users who made more than 1 order)
        const repeatCustomers = await Order.aggregate([
            { $group: { _id: '$buyer', orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 1 } } },
            { $count: 'count' }
        ]);

        res.json({
            success: true,
            data: {
                newUsersOverTime,
                totalUsers,
                activeUsers,
                repeatCustomers: repeatCustomers[0]?.count || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user analytics',
            error: error.message
        });
    }
};

// Get seller analytics
const getSellerAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        }

        // Top performing sellers
        const topSellers = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
            {
                $group: {
                    _id: '$buyer',
                    totalRevenue: { $sum: '$amount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'sellers', localField: '_id', foreignField: '_id', as: 'seller' } },
            { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } }
        ]);

        // Total sellers
        const totalSellers = await Seller.countDocuments();
        const verifiedSellers = await Seller.countDocuments({ isVerified: true });
        const pendingVerification = await Seller.countDocuments({ verificationStatus: 'pending' });

        res.json({
            success: true,
            data: {
                topSellers,
                totalSellers,
                verifiedSellers,
                pendingVerification
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching seller analytics',
            error: error.message
        });
    }
};

// Get conversion analytics
const getConversionAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        }

        // Orders by status
        const ordersByStatus = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Conversion rate (paid orders / total orders)
        const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate } });
        const paidOrders = await Order.countDocuments({ createdAt: { $gte: startDate }, status: 'paid' });
        const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

        // Cart abandonment (simplified - orders vs potential)
        const abandonedCarts = await Order.countDocuments({ 
            createdAt: { $gte: startDate }, 
            status: 'pending' 
        });

        res.json({
            success: true,
            data: {
                ordersByStatus,
                conversionRate,
                totalOrders,
                paidOrders,
                abandonedCarts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching conversion analytics',
            error: error.message
        });
    }
};

// Get financial analytics
const getFinancialAnalytics = async (req, res) => {
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

        // Revenue over time
        const revenueOverTime = await Transaction.aggregate([
            { $match: { createdAt: { $gte: startDate }, type: 'payment', status: 'completed' } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Refunds over time
        const refundsOverTime = await Transaction.aggregate([
            { $match: { createdAt: { $gte: startDate }, type: 'refund', status: 'completed' } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total revenue and refunds
        const totalRevenue = await Transaction.aggregate([
            { $match: { createdAt: { $gte: startDate }, type: 'payment', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalRefunds = await Transaction.aggregate([
            { $match: { createdAt: { $gte: startDate }, type: 'refund', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Net revenue
        const netRevenue = (totalRevenue[0]?.total || 0) - (totalRefunds[0]?.total || 0);

        res.json({
            success: true,
            data: {
                revenueOverTime,
                refundsOverTime,
                totalRevenue: totalRevenue[0]?.total || 0,
                totalRefunds: totalRefunds[0]?.total || 0,
                netRevenue
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching financial analytics',
            error: error.message
        });
    }
};

module.exports = {
    getSalesAnalytics,
    getProductAnalytics,
    getUserAnalytics,
    getSellerAnalytics,
    getConversionAnalytics,
    getFinancialAnalytics
};
