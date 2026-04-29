const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize, authenticateSeller } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { generalLimiter, searchLimiter } = require('../middleware/rateLimiter');

// Get all products with filtering and pagination
router.get('/', generalLimiter, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { isActive: true };
        
        if (req.query.category) {
            filter.category = req.query.category;
        }
        
        if (req.query.creator) {
            filter.creator = req.query.creator;
        }
        
        if (req.query.minPrice || req.query.maxPrice) {
            filter['pricing.base'] = {};
            if (req.query.minPrice) filter['pricing.base'].$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) filter['pricing.base'].$lte = parseFloat(req.query.maxPrice);
        }
        
        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }

        const products = await Product.find(filter)
            .populate('creator', 'businessName email isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            count: products.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('creator', 'businessName email isVerified')
            .populate('reviews.user', 'displayName avatar');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Increment view count
        product.popularity.views += 1;
        await product.save();

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
});

// Create new product (Seller only)
router.post('/', 
    protect, 
    authenticateSeller, 
    ...validationRules.createProduct,
    validate,
    async (req, res) => {
        try {
            const productData = {
                ...req.body,
                creator: req.seller._id
            };

            const product = await Product.create(productData);

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
    }
);

// Update product (Seller only)
router.put('/:id', 
    protect, 
    authenticateSeller, 
    async (req, res) => {
        try {
            let product = await Product.findById(req.params.id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Check ownership
            if (product.creator.toString() !== req.seller._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this product'
                });
            }

            product = await Product.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            });

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
    }
);

// Delete product (Seller only)
router.delete('/:id', protect, authenticateSeller, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check ownership
        if (product.creator.toString() !== req.seller._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this product'
            });
        }

        // Soft delete
        product.isActive = false;
        await product.save();

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
});

// Add review to product
router.post('/:id/reviews', protect, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if user already reviewed
        const alreadyReviewed = product.reviews.find(
            r => r.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product'
            });
        }

        const review = {
            user: req.user._id,
            rating: req.body.rating,
            emotionalImpactScore: req.body.emotionalImpactScore || 0,
            customizationQuality: req.body.customizationQuality || 0,
            deliveryTimeliness: req.body.deliveryTimeliness || 0,
            comment: req.body.comment
        };

        product.reviews.push(review);
        await product.save();

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding review',
            error: error.message
        });
    }
});

// Get featured products
router.get('/featured/list', async (req, res) => {
    try {
        const products = await Product.find({ 
            isActive: true, 
            featured: true 
        })
        .populate('creator', 'businessName email isVerified')
        .sort({ 'popularity.orders': -1 })
        .limit(10);

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching featured products',
            error: error.message
        });
    }
});

// Search products with advanced filters
router.get('/search/advanced', searchLimiter, async (req, res) => {
    try {
        const {
            query,
            category,
            minPrice,
            maxPrice,
            emotion,
            relationship,
            occasion,
            sort = 'relevance'
        } = req.query;

        const filter = { isActive: true };

        // Text search
        if (query) {
            filter.$text = { $search: query };
        }

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Price range
        if (minPrice || maxPrice) {
            filter['pricing.base'] = {};
            if (minPrice) filter['pricing.base'].$gte = parseFloat(minPrice);
            if (maxPrice) filter['pricing.base'].$lte = parseFloat(maxPrice);
        }

        // Emotional context filter
        if (emotion) {
            filter['emotionalContext.emotion'] = emotion;
        }

        // Target audience filter
        if (relationship) {
            filter['targetAudience.relationship'] = relationship;
        }

        // Build sort
        let sortObj = {};
        switch (sort) {
            case 'price-low':
                sortObj = { 'pricing.base': 1 };
                break;
            case 'price-high':
                sortObj = { 'pricing.base': -1 };
                break;
            case 'rating':
                sortObj = { averageRating: -1 };
                break;
            case 'popularity':
                sortObj = { 'popularity.orders': -1 };
                break;
            case 'emotional-impact':
                sortObj = { emotionalImpactAverage: -1 };
                break;
            default:
                sortObj = { score: { $meta: 'textScore' } };
        }

        const products = await Product.find(filter)
            .populate('creator', 'businessName email isVerified')
            .sort(sortObj)
            .limit(20);

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching products',
            error: error.message
        });
    }
});

// Get Social Wishlist (Trending Products across all users)
router.get('/social/wishlist', generalLimiter, async (req, res) => {
    try {
        // Aggregate products sorted by a popularity score
        // Score = (Orders * 2) + WishlistCount
        const products = await Product.find({ isActive: true })
            .populate('creator', 'businessName email isVerified')
            .sort({ 
                'popularity.orders': -1, 
                'popularity.wishlistCount': -1 
            })
            .limit(40);

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching social wishlist',
            error: error.message
        });
    }
});

module.exports = router;
