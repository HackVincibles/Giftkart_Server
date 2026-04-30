const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const getSellerDashboardAnalytics = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { period = '30d' } = req.query;

        const startDate = new Date();
        if (period === '7d') startDate.setDate(startDate.getDate() - 7);
        else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
        else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
        else if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);

        // 1. Get all products owned by this seller
        const sellerProducts = await Product.find({ creator: sellerId }).select('_id');
        const productIds = sellerProducts.map(p => p._id);

        // 2. Aggregate total revenue and orders (only for this seller's products)
        const orderStats = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
            { $unwind: '$products' },
            { $match: { 'products.product': { $in: productIds } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
                    totalOrders: { $sum: 1 } // Approximating order items as orders for simplicity
                }
            }
        ]);

        const totalRevenue = orderStats[0]?.totalRevenue || 0;
        const totalOrders = orderStats[0]?.totalOrders || 0;

        // 3. Sales over time (for charts)
        const salesOverTime = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
            { $unwind: '$products' },
            { $match: { 'products.product': { $in: productIds } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    dailyRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
                    ordersCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Top performing products
        const topProducts = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
            { $unwind: '$products' },
            { $match: { 'products.product': { $in: productIds } } },
            {
                $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' },
                    revenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
            { $unwind: '$productDetails' },
            {
                $project: {
                    name: '$productDetails.name',
                    totalSold: 1,
                    revenue: 1
                }
            }
        ]);

        // 5. Seller overall stats
        const user = await User.findById(sellerId);
        const activeProducts = user.creatorProfile?.stats?.activeProducts || 0;

        res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalOrders,
                    activeProducts
                },
                salesOverTime,
                topProducts
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

const getSellerWallet = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const user = await User.findById(sellerId);
        
        const Transaction = require('../models/Transaction');
        const transactions = await Transaction.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(20);

        res.json({
            success: true,
            data: {
                balance: user.creatorProfile?.wallet?.balance || 0,
                pendingWithdrawals: user.creatorProfile?.wallet?.pendingWithdrawals || 0,
                totalEarned: user.creatorProfile?.wallet?.totalEarned || 0,
                transactions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching wallet info',
            error: error.message
        });
    }
};

module.exports = {
    getSellerDashboardAnalytics,
    getSellerWallet
};
