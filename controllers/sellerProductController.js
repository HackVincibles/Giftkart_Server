const Product = require('../models/Product');
const User = require('../models/User');

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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;
        
        // Strict verification gate — only admin-approved sellers can list products
        if (!user || user.role !== 'creator' || creator.verificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: creator?.verificationStatus === 'pending'
                    ? 'Your creator account is pending admin approval. You will be notified once verified.'
                    : creator?.verificationStatus === 'rejected'
                    ? 'Your creator account has been rejected. Please contact support.'
                    : 'Creator account not verified. Contact admin.'
            });
        }

        const productData = req.body;
        
        // Calculate final price with commission
        const pricing = calculateFinalPrice(
            productData.pricing.base,
            creator.commissionRate || 15
        );

        const product = await Product.create({
            ...productData,
            creator: user._id,
            pricing: {
                ...productData.pricing,
                base: pricing.basePrice,
                platformCommission: pricing.commission,
                commissionRate: pricing.commissionRate,
                final: pricing.finalPrice
            }
        });

        // Update creator stats
        user.creatorProfile.stats.totalProducts += 1;
        await user.save();

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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

        const product = await Product.findOne({ _id: productId, creator: req.user._id });

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
                creator.commissionRate || 15
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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

        const filter = { creator: req.user._id };
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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

        const product = await Product.findOne({ _id: productId, creator: req.user._id });

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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

        const product = await Product.findOne({ _id: productId, creator: req.user._id });

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
        user.creatorProfile.stats.totalProducts = Math.max(0, (user.creatorProfile.stats.totalProducts || 0) - 1);
        await user.save();

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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

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
        const user = await User.findById(req.user._id);
        const creator = user.creatorProfile;

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

const getPendingSubmissions = async (req, res) => {
    try {
        const VibeConcept = require('../models/VibeConcept');
        const submissions = await VibeConcept.find({ status: 'pending_publication' })
            .populate('buyer', 'displayName avatar')
            .sort({ updatedAt: -1 });

        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const approveSubmission = async (req, res) => {
    try {
        const VibeConcept = require('../models/VibeConcept');
        const { id } = req.params;
        const { price, category, name } = req.body;
        
        const concept = await VibeConcept.findById(id).populate('buyer');
        if (!concept) return res.status(404).json({ success: false, message: 'Submission not found' });

        const user = await User.findById(req.user._id);
        const pricing = calculateFinalPrice(price, user.creatorProfile?.commissionRate || 15);

        // Transform Masterpiece into a Live Product
        const product = await Product.create({
            name: name || `Artisan Choice: ${concept.buyer?.displayName}'s Pick`,
            description: `A photorealistic artisan hamper created for ${concept.buyer?.displayName}. Optimized for gift-giving with premium arrangement.`,
            category: category || 'Curated Hampers',
            images: [concept.canvasState.previewUrl],
            creator: req.user._id,
            artisanId: concept.buyer?._id, // Attribute to the creator
            pricing: {
                base: pricing.basePrice,
                platformCommission: pricing.commission,
                commissionRate: pricing.commissionRate,
                final: pricing.finalPrice
            },
            isActive: true,
            isArtisanMasterpiece: true, // Special tag
            conceptId: concept._id
        });

        concept.status = 'published';
        await concept.save();

        res.json({ success: true, message: 'Masterpiece is now LIVE in the store!', data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createProduct,
    updateProduct,
    getSellerProducts,
    getProduct,
    deleteProduct,
    getCommissionInfo,
    calculatePricePreview,
    getPendingSubmissions,
    approveSubmission
};
