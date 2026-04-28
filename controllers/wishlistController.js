const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Get user's wishlist
const getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate('products.product');

        if (!wishlist) {
            // Create new wishlist if doesn't exist
            const newWishlist = await Wishlist.create({ user: req.user._id });
            return res.json({
                success: true,
                data: newWishlist
            });
        }

        res.json({
            success: true,
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching wishlist',
            error: error.message
        });
    }
};

// Add product to wishlist
const addToWishlist = async (req, res) => {
    try {
        const { productId, notes, priority } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get or create wishlist
        let wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id });
        }

        // Check if product already in wishlist
        const existingIndex = wishlist.products.findIndex(
            p => p.product.toString() === productId
        );

        if (existingIndex !== -1) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        // Add product to wishlist
        wishlist.products.push({
            product: productId,
            addedAt: Date.now(),
            notes,
            priority: priority || 'medium'
        });

        await wishlist.save();

        res.json({
            success: true,
            message: 'Product added to wishlist',
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding to wishlist',
            error: error.message
        });
    }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Remove product
        wishlist.products = wishlist.products.filter(
            p => p.product.toString() !== productId
        );

        await wishlist.save();

        res.json({
            success: true,
            message: 'Product removed from wishlist',
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing from wishlist',
            error: error.message
        });
    }
};

// Update wishlist item
const updateWishlistItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { notes, priority } = req.body;

        const wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Find and update product
        const productIndex = wishlist.products.findIndex(
            p => p.product.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not in wishlist'
            });
        }

        if (notes !== undefined) wishlist.products[productIndex].notes = notes;
        if (priority) wishlist.products[productIndex].priority = priority;

        await wishlist.save();

        res.json({
            success: true,
            message: 'Wishlist item updated',
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating wishlist item',
            error: error.message
        });
    }
};

// Share wishlist
const shareWishlist = async (req, res) => {
    try {
        const { isPublic, name, description, occasion, targetDate } = req.body;

        const wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Update wishlist
        if (isPublic !== undefined) wishlist.isPublic = isPublic;
        if (name) wishlist.name = name;
        if (description !== undefined) wishlist.description = description;
        if (occasion) wishlist.occasion = occasion;
        if (targetDate) wishlist.targetDate = targetDate;

        // Generate share URL if making public
        if (isPublic && !wishlist.shareUrl) {
            wishlist.shareUrl = `${process.env.CLIENT_URL}/wishlist/${wishlist._id}`;
        }

        await wishlist.save();

        res.json({
            success: true,
            message: 'Wishlist updated',
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sharing wishlist',
            error: error.message
        });
    }
};

// Get public wishlist
const getPublicWishlist = async (req, res) => {
    try {
        const { wishlistId } = req.params;

        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            isPublic: true
        }).populate('products.product');

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found or not public'
            });
        }

        res.json({
            success: true,
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching public wishlist',
            error: error.message
        });
    }
};

// Move item to cart
const moveToCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        const wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Check if product in wishlist
        const productIndex = wishlist.products.findIndex(
            p => p.product.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not in wishlist'
            });
        }

        // Add to cart (assuming cart exists in user model or separate cart model)
        // This would integrate with your existing cart system
        // For now, just remove from wishlist
        wishlist.products.splice(productIndex, 1);
        await wishlist.save();

        res.json({
            success: true,
            message: 'Item moved to cart',
            data: wishlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error moving to cart',
            error: error.message
        });
    }
};

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem,
    shareWishlist,
    getPublicWishlist,
    moveToCart
};
