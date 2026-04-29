const Message = require('../models/Message');
const Order = require('../models/Order');

// Get messages for an order
exports.getOrderMessages = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check authorization
        const isBuyer = order.buyer.toString() === req.user._id.toString();
        // For creator check, we need to find if the user is a creator for any product in the order
        // This is a bit simplified for now
        
        const messages = await Message.find({ order: orderId })
            .sort({ createdAt: 1 })
            .populate('sender', 'displayName avatar');

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
};

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { orderId, content, recipientId } = req.body;
        const senderId = req.user._id;
        
        // Determine models based on role
        const isSeller = req.user.role === 'seller' || req.user.role === 'creator';
        const senderModel = isSeller ? 'Seller' : 'User';
        const recipientModel = isSeller ? 'User' : 'Seller';

        const newMessage = await Message.create({
            order: orderId,
            sender: senderId,
            senderModel,
            recipient: recipientId,
            recipientModel,
            content
        });

        const populatedMessage = await Message.findById(newMessage._id).populate('sender');

        // Socket.io emission
        const socketService = require('../services/socket');
        socketService.emitNewMessage(orderId, populatedMessage);

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
};

// Get all conversations for a user
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all messages where user is either sender or recipient
        const messages = await Message.find({
            $or: [{ sender: userId }, { recipient: userId }]
        })
        .sort({ createdAt: -1 })
        .populate('sender')
        .populate('recipient')
        .populate('order', 'products amount');

        const conversations = [];
        const seenOrders = new Set();

        for (const msg of messages) {
            const orderId = msg.order?._id?.toString();
            if (orderId && !seenOrders.has(orderId)) {
                seenOrders.add(orderId);
                
                // Identify the "other" person in the chat
                const isMeSender = msg.sender?._id?.toString() === userId.toString();
                const otherUser = isMeSender ? msg.recipient : msg.sender;
                
                if (otherUser) {
                    conversations.push({
                        orderId,
                        lastMessage: msg.content,
                        updatedAt: msg.createdAt,
                        unread: !msg.read && !isMeSender,
                        otherUser: {
                            id: otherUser._id,
                            name: otherUser.displayName || otherUser.businessName || otherUser.ownerName || 'User',
                            avatar: otherUser.avatar || otherUser.profileImage
                        }
                    });
                }
            }
        }

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Get Conversations Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversations' });
    }
};
