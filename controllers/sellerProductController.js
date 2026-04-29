const Product = require('../models/Product');
const Seller = require('../models/Seller');

// Calculate final price with platform commission
const calculateFinalPrice = (basePrice, commissionRate) => {
    const commission = (basePrice * commissionRate) / 100;
    return {
        basePrice,
        commission,
        commissionRate,
        finalPrice: basePrice + commission
    };
};

// Create product
const createProduct = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id);
        
        // Strict verification gate — only admin-approved sellers can list products
        if (!seller || seller.verificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: seller?.verificationStatus === 'pending'
                    ? 'Your seller account is pending admin approval. You will be notified once verified.'
                    : seller?.verificationStatus === 'rejected'
                    ? 'Your seller account has been rejected. Please contact support.'
                    : 'Seller account not verified. Contact admin.'
            });
        }

        const productData = req.body;
        
        // Calculate final price with commission
        const pricing = calculateFinalPrice(
            productData.pricing.base,
            seller.commissionRate
        );

        const product = await Product.create({
            ...productData,
            creator: seller._id,
            pricing: {
                ...productData.pricing,
                base: pricing.basePrice,
                platformCommission: pricing.commission,
                commissionRate: pricing.commissionRate,
                final: pricing.finalPrice
            }
        });

        // Update seller stats
        seller.stats.totalProducts += 1;
        seller.stats.activeProducts += 1;
        await seller.save();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const seller = await Seller.findById(req.seller._id);

        const product = await Product.findOne({ _id: productId, creator: seller._id });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // If price is being updated, recalculate commission
        if (req.body.pricing && req.body.pricing.base) {
            const pricing = calculateFinalPrice(
                req.body.pricing.base,
                seller.commissionRate
            );
            req.body.pricing = {
                ...req.body.pricing,
                base: pricing.basePrice,
                platformCommission: pricing.commission,
                commissionRate: pricing.commissionRate,
                final: pricing.finalPrice
            };
        }

        Object.assign(product, req.body);
        await product.save();

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
};

// Get seller's products
const getSellerProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const seller = await Seller.findById(req.seller._id);

        const filter = { creator: seller._id };
        if (status) {
            filter.isActive = status === 'active';
        }

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: {
                products,
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
            message: 'Error fetching products',
            error: error.message
        });
    }
};

// Get single product details
const getProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const seller = await Seller.findById(req.seller._id);

        const product = await Product.findOne({ _id: productId, creator: seller._id });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching product details',
            error: error.message
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const seller = await Seller.findById(req.seller._id);

        const product = await Product.findOne({ _id: productId, creator: seller._id });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete
        product.isActive = false;
        product.deletedAt = Date.now();
        await product.save();

        // Update seller stats
        seller.stats.activeProducts -= 1;
        await seller.save();

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
};

// Get seller's commission info
const getCommissionInfo = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id);

        res.json({
            success: true,
            data: {
                commissionRate: seller.commissionRate,
                description: `Platform charges ${seller.commissionRate}% commission on each sale`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching commission info',
            error: error.message
        });
    }
};

// Calculate price preview
const calculatePricePreview = async (req, res) => {
    try {
        const { basePrice } = req.body;
        const seller = await Seller.findById(req.seller._id);

        const pricing = calculateFinalPrice(basePrice, seller.commissionRate);

        res.json({
            success: true,
            data: pricing
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error calculating price',
            error: error.message
        });
    }
};

module.exports = {
    createProduct,
    updateProduct,
    getSellerProducts,
    getProduct,
    deleteProduct,
    getCommissionInfo,
    calculatePricePreview
};
