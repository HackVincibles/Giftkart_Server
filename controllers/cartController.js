const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const notificationService = require('../services/notificationService');

// Get user's cart
const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id })
            .populate('items.product')
            .populate('items.customization')
            .populate('appliedCoupon');

        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        const activeItems = cart.getActiveItems();
        const savedItems = cart.getSavedItems();
        const subtotal = cart.calculateTotal();

        res.json({
            success: true,
            data: {
                cart,
                activeItems,
                savedItems,
                subtotal,
                discountAmount: cart.discountAmount,
                total: subtotal
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching cart',
            error: error.message
        });
    }
};

// Add item to cart
const addToCart = async (req, res) => {
    try {
        const { productId, quantity, customizationId, selectedVariants, giftWrap, giftWrapType, giftMessage } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && 
                   JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants) &&
                   !item.savedForLater
        );

        if (existingItemIndex !== -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].price = product.basePrice;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                price: product.basePrice,
                customization: customizationId,
                selectedVariants,
                giftWrap,
                giftWrapType,
                giftMessage,
                addedAt: Date.now()
            });
        }

        await cart.save();

        // Send Notification
        await notificationService.notifyCartAdded(req.user._id, product.name);

        res.json({
            success: true,
            message: 'Item added to cart',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding to cart',
            error: error.message
        });
    }
};

// Update item quantity
const updateItemQuantity = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();

        res.json({
            success: true,
            message: 'Item quantity updated',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating quantity',
            error: error.message
        });
    }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        await cart.save();

        res.json({
            success: true,
            message: 'Item removed from cart',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing from cart',
            error: error.message
        });
    }
};

// Save item for later
const saveForLater = async (req, res) => {
    try {
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items[itemIndex].savedForLater = true;
        cart.items[itemIndex].savedAt = Date.now();
        await cart.save();

        res.json({
            success: true,
            message: 'Item saved for later',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving item',
            error: error.message
        });
    }
};

// Move saved item back to cart
const moveToCart = async (req, res) => {
    try {
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        cart.items[itemIndex].savedForLater = false;
        cart.items[itemIndex].savedAt = null;
        await cart.save();

        res.json({
            success: true,
            message: 'Item moved back to cart',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error moving item',
            error: error.message
        });
    }
};

// Apply coupon to cart
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Validate coupon
        if (!coupon.isValid()) {
            return res.status(400).json({
                success: false,
                message: 'Coupon is expired or inactive'
            });
        }

        // Check user usage limit
        const canUse = await coupon.canUserUse(req.user._id);
        if (!canUse) {
            return res.status(400).json({
                success: false,
                message: 'You have already used this coupon the maximum number of times'
            });
        }

        // Calculate discount
        const subtotal = cart.calculateTotal();
        let discountAmount = 0;

        if (coupon.discountType === 'percentage') {
            discountAmount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else if (coupon.discountType === 'fixed') {
            discountAmount = coupon.discountValue;
        }

        cart.appliedCoupon = coupon._id;
        cart.discountAmount = discountAmount;
        await cart.save();

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                discountAmount,
                total: subtotal - discountAmount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error applying coupon',
            error: error.message
        });
    }
};

// Remove coupon from cart
const removeCoupon = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.appliedCoupon = null;
        cart.discountAmount = 0;
        await cart.save();

        res.json({
            success: true,
            message: 'Coupon removed successfully',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing coupon',
            error: error.message
        });
    }
};

// Clear cart
const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = [];
        cart.appliedCoupon = null;
        cart.discountAmount = 0;
        await cart.save();

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error clearing cart',
            error: error.message
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    saveForLater,
    moveToCart,
    applyCoupon,
    removeCoupon,
    clearCart
};
