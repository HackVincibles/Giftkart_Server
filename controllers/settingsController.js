const Policy = require('../models/Policy');
const Grievance = require('../models/Grievance');

// Get all policies
const getPolicies = async (req, res) => {
    try {
        const policies = await Policy.find({ isActive: true });
        
        res.json({
            success: true,
            data: policies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching policies',
            error: error.message
        });
    }
};

// Get specific policy
const getPolicy = async (req, res) => {
    try {
        const { type } = req.params;
        
        const policy = await Policy.findOne({ type, isActive: true });
        
        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Policy not found'
            });
        }
        
        res.json({
            success: true,
            data: policy
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching policy',
            error: error.message
        });
    }
};

// Create grievance
const createGrievance = async (req, res) => {
    try {
        const { category, subject, description, orderId, productId, attachments, priority } = req.body;
        
        const grievance = await Grievance.create({
            user: req.user._id,
            order: orderId,
            product: productId,
            category,
            subject,
            description,
            attachments: attachments || [],
            priority: priority || 'medium',
            status: 'open',
            messages: [{
                sender: req.user._id,
                senderType: 'user',
                message: description,
                timestamp: Date.now()
            }]
        });
        
        res.status(201).json({
            success: true,
            message: 'Grievance created successfully',
            data: grievance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating grievance',
            error: error.message
        });
    }
};

// Get user's grievances
const getUserGrievances = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const filter = { user: req.user._id };
        if (status) {
            filter.status = status;
        }
        
        const grievances = await Grievance.find(filter)
            .populate('order')
            .populate('product')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Grievance.countDocuments(filter);
        
        res.json({
            success: true,
            data: {
                grievances,
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
            message: 'Error fetching grievances',
            error: error.message
        });
    }
};

// Get grievance details
const getGrievanceDetails = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        
        const grievance = await Grievance.findById(grievanceId)
            .populate('order')
            .populate('product')
            .populate('messages.sender', 'name email');
        
        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found'
            });
        }
        
        // Check authorization
        if (grievance.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this grievance'
            });
        }
        
        res.json({
            success: true,
            data: grievance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching grievance details',
            error: error.message
        });
    }
};

// Add message to grievance
const addGrievanceMessage = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { message, attachments } = req.body;
        
        const grievance = await Grievance.findById(grievanceId);
        
        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found'
            });
        }
        
        // Check authorization
        if (grievance.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to add message'
            });
        }
        
        grievance.messages.push({
            sender: req.user._id,
            senderType: 'user',
            message,
            attachments: attachments || [],
            timestamp: Date.now()
        });
        
        // Update status if needed
        if (grievance.status === 'open') {
            grievance.status = 'in_progress';
        }
        
        await grievance.save();
        
        res.json({
            success: true,
            message: 'Message added successfully',
            data: grievance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding message',
            error: error.message
        });
    }
};

// Submit feedback on grievance
const submitGrievanceFeedback = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { rating, comments } = req.body;
        
        const grievance = await Grievance.findById(grievanceId);
        
        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found'
            });
        }
        
        // Check authorization
        if (grievance.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to submit feedback'
            });
        }
        
        grievance.userFeedback = {
            rating,
            comments,
            submittedAt: Date.now()
        };
        
        if (grievance.status !== 'closed') {
            grievance.status = 'closed';
        }
        
        await grievance.save();
        
        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: grievance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: error.message
        });
    }
};

// Escalate grievance
const escalateGrievance = async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { reason } = req.body;
        
        const grievance = await Grievance.findById(grievanceId);
        
        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found'
            });
        }
        
        // Check authorization
        if (grievance.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to escalate'
            });
        }
        
        grievance.escalated = true;
        grievance.escalatedAt = Date.now();
        grievance.escalationReason = reason;
        grievance.status = 'escalated';
        grievance.priority = 'high';
        
        await grievance.save();
        
        res.json({
            success: true,
            message: 'Grievance escalated successfully',
            data: grievance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error escalating grievance',
            error: error.message
        });
    }
};

// Get support contact info
const getSupportInfo = async (req, res) => {
    try {
        const supportInfo = {
            email: process.env.SUPPORT_EMAIL || 'support@giftkart.com',
            phone: process.env.SUPPORT_PHONE || '+91-XXXXXXXXXX',
            whatsapp: process.env.WHATSAPP_NUMBER || '+91-XXXXXXXXXX',
            workingHours: {
                days: 'Monday to Sunday',
                hours: '9:00 AM to 9:00 PM IST'
            },
            faqUrl: `${process.env.CLIENT_URL}/faq`,
            helpCenterUrl: `${process.env.CLIENT_URL}/help`
        };
        
        res.json({
            success: true,
            data: supportInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching support info',
            error: error.message
        });
    }
};

module.exports = {
    getPolicies,
    getPolicy,
    createGrievance,
    getUserGrievances,
    getGrievanceDetails,
    addGrievanceMessage,
    submitGrievanceFeedback,
    escalateGrievance,
    getSupportInfo
};
