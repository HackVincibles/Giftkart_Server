const Product = require('../models/Product');

// Typesense client would be initialized here
// For now, implementing MongoDB-based search that can be enhanced with Typesense

// Advanced search with filters
const searchProducts = async (req, res) => {
    try {
        const {
            q,
            category,
            minPrice,
            maxPrice,
            emotion,
            relationship,
            occasion,
            creator,
            sortBy = 'relevance',
            page = 1,
            limit = 20
        } = req.query;

        const skip = (page - 1) * limit;
        const filter = { isActive: true };

        // Text search
        if (q) {
            filter.$text = { $search: q };
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

        // Emotion filter
        if (emotion) {
            filter['emotionalContext.emotion'] = emotion;
        }

        // Relationship filter
        if (relationship) {
            filter['targetAudience.relationship'] = relationship;
        }

        // Creator filter
        if (creator) {
            filter.creator = creator;
        }

        // Build sort
        let sortObj = {};
        switch (sortBy) {
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
            case 'newest':
                sortObj = { createdAt: -1 };
                break;
            default:
                sortObj = { score: { $meta: 'textScore' } };
        }

        const products = await Product.find(filter)
            .populate('creator', 'displayName creatorProfile.studioName creatorProfile.isVerified')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filter);

        // Get search suggestions/facets
        const facets = await getSearchFacets(filter);

        res.json({
            success: true,
            count: products.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: products,
            facets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching products',
            error: error.message
        });
    }
};

// Get search facets (categories, price ranges, emotions, etc.)
const getSearchFacets = async (filter) => {
    try {
        // Get unique categories
        const categories = await Product.distinct('category', { isActive: true });
        
        // Get price ranges
        const priceStats = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: {
                _id: null,
                minPrice: { $min: '$pricing.base' },
                maxPrice: { $max: '$pricing.base' },
                avgPrice: { $avg: '$pricing.base' }
            }}
        ]);

        // Get emotions
        const emotions = await Product.distinct('emotionalContext.emotion', { isActive: true });

        // Get relationships
        const relationships = await Product.distinct('targetAudience.relationship', { isActive: true });

        return {
            categories,
            priceRange: priceStats[0] || { minPrice: 0, maxPrice: 10000, avgPrice: 500 },
            emotions,
            relationships
        };
    } catch (error) {
        return {};
    }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }

        // Search for matching product names
        const products = await Product.find({
            isActive: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { 'aiTags.tag': { $regex: q, $options: 'i' } }
            ]
        })
        .select('name category pricing.base images')
        .limit(10);

        const suggestions = products.map(p => ({
            id: p._id,
            name: p.name,
            category: p.category,
            price: p.pricing.base,
            image: p.images[0]?.url || null
        }));

        res.json({
            success: true,
            suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting search suggestions',
            error: error.message
        });
    }
};

// Trending searches
const getTrendingSearches = async (req, res) => {
    try {
        // This would typically come from analytics data
        // For now, returning mock data based on popular categories
        const trending = [
            { term: 'birthday gifts', count: 1250 },
            { term: 'personalized photo frames', count: 980 },
            { term: 'custom mugs', count: 856 },
            { term: 'anniversary gifts', count: 743 },
            { term: 'engraved jewelry', count: 621 },
            { term: 'custom art', count: 589 },
            { term: 'gift boxes', count: 534 },
            { term: 'diwali gifts', count: 478 }
        ];

        res.json({
            success: true,
            trending
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting trending searches',
            error: error.message
        });
    }
};

// Search by emotion
const searchByEmotion = async (req, res) => {
    try {
        const { emotion } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const products = await Product.find({
            isActive: true,
            'emotionalContext.emotion': emotion
        })
        .populate('creator', 'displayName creatorProfile.studioName')
        .sort({ emotionalImpactAverage: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Product.countDocuments({
            isActive: true,
            'emotionalContext.emotion': emotion
        });

        res.json({
            success: true,
            count: products.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching by emotion',
            error: error.message
        });
    }
};

// Search by relationship
const searchByRelationship = async (req, res) => {
    try {
        const { relationship } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const products = await Product.find({
            isActive: true,
            'targetAudience.relationship': relationship
        })
        .populate('creator', 'displayName creatorProfile.studioName')
        .sort({ averageRating: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Product.countDocuments({
            isActive: true,
            'targetAudience.relationship': relationship
        });

        res.json({
            success: true,
            count: products.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching by relationship',
            error: error.message
        });
    }
};

// Get similar products
const getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Find similar products based on category, emotion, and tags
        const similarProducts = await Product.find({
            isActive: true,
            _id: { $ne: productId },
            $or: [
                { category: product.category },
                { 'emotionalContext.emotion': { $in: product.emotionalContext.map(e => e.emotion) } },
                { 'aiTags.tag': { $in: product.aiTags.map(t => t.tag) } }
            ]
        })
        .populate('creator', 'displayName creatorProfile.studioName')
        .limit(limit);

        res.json({
            success: true,
            count: similarProducts.length,
            data: similarProducts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting similar products',
            error: error.message
        });
    }
};

module.exports = {
    searchProducts,
    getSearchSuggestions,
    getTrendingSearches,
    searchByEmotion,
    searchByRelationship,
    getSimilarProducts
};
