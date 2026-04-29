const { Server } = require('socket.io');
const { logger } = require('./logger');

// Store connected users and sellers
const connectedUsers = new Map();
const connectedSellers = new Map();

// Initialize Socket.io
let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        logger.info('Client connected', { socketId: socket.id });

        // User authentication
        socket.on('authenticate', (data) => {
            const { userId, userType } = data;
            
            if (userType === 'user') {
                connectedUsers.set(userId, socket.id);
                socket.userId = userId;
                socket.userType = 'user';
                logger.info('User authenticated', { userId, socketId: socket.id });
            } else if (userType === 'seller') {
                connectedSellers.set(userId, socket.id);
                socket.userId = userId;
                socket.userType = 'seller';
                logger.info('Seller authenticated', { sellerId: userId, socketId: socket.id });
            }
        });

        // Join order room
        socket.on('join-order', (orderId) => {
            socket.join(`order:${orderId}`);
            logger.info('Joined order room', { orderId, socketId: socket.id });
        });

        // Leave order room
        socket.on('leave-order', (orderId) => {
            socket.leave(`order:${orderId}`);
            logger.info('Left order room', { orderId, socketId: socket.id });
        });

        // Join seller room (for seller-specific updates)
        socket.on('join-seller-room', (sellerId) => {
            socket.join(`seller:${sellerId}`);
            logger.info('Joined seller room', { sellerId, socketId: socket.id });
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (socket.userType === 'user') {
                connectedUsers.delete(socket.userId);
                logger.info('User disconnected', { userId: socket.userId });
            } else if (socket.userType === 'seller') {
                connectedSellers.delete(socket.userId);
                logger.info('Seller disconnected', { sellerId: socket.userId });
            }
        });
    });

    logger.info('Socket.io initialized');
    return io;
};

// Emit order update to user
const emitOrderUpdate = (userId, orderId, updateData) => {
    if (io) {
        io.to(`order:${orderId}`).emit('order-update', {
            orderId,
            ...updateData
        });
        
        // Also emit to specific user if they're connected
        const userSocketId = connectedUsers.get(userId);
        if (userSocketId) {
            io.to(userSocketId).emit('order-update', {
                orderId,
                ...updateData
            });
        }
        
        logger.info('Order update emitted', { userId, orderId, updateType: updateData.type });
    }
};

// Emit new order to seller
const emitNewOrder = (sellerId, orderData) => {
    if (io) {
        const sellerSocketId = connectedSellers.get(sellerId);
        if (sellerSocketId) {
            io.to(sellerSocketId).emit('new-order', orderData);
            io.to(`seller:${sellerId}`).emit('new-order', orderData);
            logger.info('New order emitted to seller', { sellerId, orderId: orderData._id });
        }
    }
};

// Emit order status change
const emitOrderStatusChange = (orderId, status, additionalData = {}) => {
    if (io) {
        io.to(`order:${orderId}`).emit('order-status-change', {
            orderId,
            status,
            ...additionalData
        });
        logger.info('Order status change emitted', { orderId, status });
    }
};

// Emit tracking update
const emitTrackingUpdate = (orderId, trackingData) => {
    if (io) {
        io.to(`order:${orderId}`).emit('tracking-update', {
            orderId,
            ...trackingData
        });
        logger.info('Tracking update emitted', { orderId });
    }
};

// Emit notification to user
const emitNotification = (userId, notificationData) => {
    if (io) {
        const userSocketId = connectedUsers.get(userId);
        if (userSocketId) {
            io.to(userSocketId).emit('notification', notificationData);
            logger.info('Notification emitted', { userId, notificationType: notificationData.type });
        }
    }
};

// Emit notification to seller
const emitSellerNotification = (sellerId, notificationData) => {
    if (io) {
        const sellerSocketId = connectedSellers.get(sellerId);
        if (sellerSocketId) {
            io.to(sellerSocketId).emit('notification', notificationData);
            io.to(`seller:${sellerId}`).emit('notification', notificationData);
            logger.info('Seller notification emitted', { sellerId, notificationType: notificationData.type });
        }
    }
};

// Broadcast to all connected users
const broadcastToUsers = (event, data) => {
    if (io) {
        connectedUsers.forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
        logger.info('Broadcast to users', { event });
    }
};

// Broadcast to all connected sellers
const broadcastToSellers = (event, data) => {
    if (io) {
        connectedSellers.forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
        logger.info('Broadcast to sellers', { event });
    }
};

// Get connected users count
const getConnectedUsersCount = () => {
    return connectedUsers.size;
};

// Get connected sellers count
const getConnectedSellersCount = () => {
    return connectedSellers.size;
};

// Emit new chat message
const emitNewMessage = (orderId, message) => {
    if (io) {
        io.to(`order:${orderId}`).emit('new-message', message);
        logger.info('New message emitted', { orderId });
    }
};

module.exports = {
    initializeSocket,
    emitOrderUpdate,
    emitNewOrder,
    emitOrderStatusChange,
    emitTrackingUpdate,
    emitNotification,
    emitSellerNotification,
    broadcastToUsers,
    broadcastToSellers,
    getConnectedUsersCount,
    getConnectedSellersCount,
    emitNewMessage
};
