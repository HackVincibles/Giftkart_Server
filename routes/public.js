const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// @route   GET api/public/memory/:id
// @desc    Get public order design data for the Memory Link
// @access  Public
router.get('/memory/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .select('designData artisanName createdAt amount'); // Exclude sensitive buyer info

        if (!order) {
            return res.status(404).json({ success: false, message: 'Memory not found' });
        }

        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error('Public Fetch Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
