const Notification = require('../models/Notification');

class NotificationService {
    /**
     * Create a new notification
     * @param {Object} data - Notification data
     * @returns {Promise<Object>} Created notification
     */
    async create(data) {
        try {
            const notification = await Notification.create({
                ...data,
                createdAt: Date.now()
            });
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            // Don't throw to avoid breaking the main request
        }
    }

    /**
     * Notify user of a new order
     */
    async notifyOrderPlaced(userId, orderId, totalAmount) {
        return this.create({
            user: userId,
            type: 'order_placed',
            title: '🎁 Order Placed Successfully!',
            message: `Your order for ₹${totalAmount} has been received and is being processed.`,
            relatedOrder: orderId,
            actionUrl: `/orders/${orderId}`,
            priority: 'high'
        });
    }

    /**
     * Notify user of a new schedule
     */
    async notifyScheduleAdded(userId, recipient, occasion) {
        return this.create({
            user: userId,
            type: 'schedule_added',
            title: '📅 New Gifting Schedule',
            message: `You've successfully scheduled a gift for ${recipient}'s ${occasion}. We'll remind you in time!`,
            actionUrl: '/auto-gifting',
            priority: 'medium'
        });
    }

    /**
     * Notify user of cart addition
     */
    async notifyCartAdded(userId, productName) {
        return this.create({
            user: userId,
            type: 'cart_added',
            title: '🛒 Added to Cart',
            message: `"${productName}" has been added to your shopping cart. Ready to checkout?`,
            actionUrl: '/cart',
            priority: 'low'
        });
    }

    /**
     * Notify user of wishlist addition
     */
    async notifyWishlistAdded(userId, productName) {
        return this.create({
            user: userId,
            type: 'wishlist_added',
            title: '❤️ Saved to Wishlist',
            message: `"${productName}" is now in your favorites. We'll track its price for you!`,
            actionUrl: '/wishlist',
            priority: 'low'
        });
    }

    /**
     * Notify user of payment success
     */
    async notifyPaymentSuccess(userId, amount, orderId) {
        return this.create({
            user: userId,
            type: 'payment_received',
            title: '✅ Payment Confirmed',
            message: `We've received your payment of ₹${amount}. Thank you for shopping with GiftKart!`,
            relatedOrder: orderId,
            priority: 'high'
        });
    }
}

module.exports = new NotificationService();
