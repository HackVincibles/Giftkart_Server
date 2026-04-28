const ShippingProvider = require('../models/ShippingProvider');
const Order = require('../models/Order');
const OrderTracking = require('../models/OrderTracking');

// Calculate shipping cost
const calculateShippingCost = async (req, res) => {
    try {
        const { weight, distance, pincode, serviceType } = req.body;

        // Get active shipping providers
        const providers = await ShippingProvider.find({ isActive: true });

        const shippingOptions = providers.map(provider => {
            const baseRate = provider.pricing.baseRate || 50;
            const weightRate = provider.pricing.ratePerKg || 30;
            const distanceRate = provider.pricing.ratePerKm || 2;
            const fuelSurcharge = provider.pricing.fuelSurcharge || 10;

            const totalCost = baseRate + (weight * weightRate) + (distance * distanceRate) + fuelSurcharge;

            return {
                provider: provider.name,
                displayName: provider.displayName,
                serviceType: serviceType || 'standard',
                estimatedDays: calculateEstimatedDays(provider.name, pincode),
                cost: Math.round(totalCost),
                breakdown: {
                    baseRate,
                    weightCharge: weight * weightRate,
                    distanceCharge: distance * distanceRate,
                    fuelSurcharge
                }
            };
        });

        res.json({
            success: true,
            data: shippingOptions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error calculating shipping cost',
            error: error.message
        });
    }
};

// Helper function to estimate delivery days
const calculateEstimatedDays = (provider, pincode) => {
    const regionCode = pincode.substring(0, 3);
    
    // Metro cities - faster delivery
    if (['110', '100', '001'].includes(regionCode)) {
        return provider === 'delhivery' ? 2 : 3;
    }
    // Major cities
    else if (['400', '500', '600'].includes(regionCode)) {
        return 3;
    }
    // Other areas
    return 5;
};

// Generate shipping label
const generateShippingLabel = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('products.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Generate label data (in production, integrate with provider API)
        const labelData = {
            orderId: order._id,
            trackingNumber: `GIFT${Date.now()}${Math.floor(Math.random() * 1000)}`,
            shipper: {
                name: 'GiftKart',
                address: '123 Gift Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                phone: '+91-XXXXXXXXXX'
            },
            consignee: {
                name: order.shippingAddress.name,
                address: order.shippingAddress.address,
                city: order.shippingAddress.city,
                state: order.shippingAddress.state,
                pincode: order.shippingAddress.pincode,
                phone: order.shippingAddress.phone
            },
            package: {
                weight: '0.5 kg',
                dimensions: '20x15x10 cm',
                value: order.totalAmount,
                description: 'Gift Items'
            },
            service: 'Standard Delivery',
            generatedAt: new Date()
        };

        res.json({
            success: true,
            message: 'Shipping label generated',
            data: labelData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating shipping label',
            error: error.message
        });
    }
};

// Track shipment (external provider integration)
const trackShipment = async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        // In production, call actual provider API
        // For now, return mock data
        const trackingData = {
            trackingNumber,
            status: 'in_transit',
            currentLocation: 'Mumbai Hub',
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            history: [
                {
                    status: 'picked_up',
                    location: 'Seller Location',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    description: 'Package picked up from seller'
                },
                {
                    status: 'in_transit',
                    location: 'Mumbai Hub',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                    description: 'Package arrived at sorting hub'
                }
            ]
        };

        res.json({
            success: true,
            data: trackingData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error tracking shipment',
            error: error.message
        });
    }
};

// Get available shipping providers
const getShippingProviders = async (req, res) => {
    try {
        const providers = await ShippingProvider.find({ isActive: true });

        res.json({
            success: true,
            data: providers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching shipping providers',
            error: error.message
        });
    }
};

// Create shipping provider (admin only)
const createShippingProvider = async (req, res) => {
    try {
        const provider = await ShippingProvider.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Shipping provider created',
            data: provider
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating shipping provider',
            error: error.message
        });
    }
};

// Update shipping provider (admin only)
const updateShippingProvider = async (req, res) => {
    try {
        const { providerId } = req.params;
        const provider = await ShippingProvider.findByIdAndUpdate(
            providerId,
            req.body,
            { new: true }
        );

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            message: 'Provider updated',
            data: provider
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating provider',
            error: error.message
        });
    }
};

module.exports = {
    calculateShippingCost,
    generateShippingLabel,
    trackShipment,
    getShippingProviders,
    createShippingProvider,
    updateShippingProvider
};
