const ProductPreview = require('../models/ProductPreview');
const Product = require('../models/Product');

// Create product preview
const createProductPreview = async (req, res) => {
    try {
        const { productId } = req.params;
        const previewData = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if preview already exists
        let preview = await ProductPreview.findOne({ product: productId });
        if (preview) {
            // Update existing preview
            Object.assign(preview, previewData);
            await preview.save();
        } else {
            // Create new preview
            preview = await ProductPreview.create({
                product: productId,
                ...previewData
            });
        }

        res.json({
            success: true,
            message: 'Product preview saved',
            data: preview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving product preview',
            error: error.message
        });
    }
};

// Get product preview
const getProductPreview = async (req, res) => {
    try {
        const { productId } = req.params;

        const preview = await ProductPreview.findOne({ product: productId })
            .populate('product');

        if (!preview) {
            return res.status(404).json({
                success: false,
                message: 'Product preview not found'
            });
        }

        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching product preview',
            error: error.message
        });
    }
};

// Update 3D model
const update3DModel = async (req, res) => {
    try {
        const { productId } = req.params;
        const { modelUrl, thumbnailUrl, format, scale, rotationSpeed, autoRotate, cameraPositions } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        preview.model3D = {
            enabled: true,
            modelUrl,
            thumbnailUrl,
            format,
            scale,
            rotationSpeed,
            autoRotate,
            cameraPositions
        };

        await preview.save();

        res.json({
            success: true,
            message: '3D model updated',
            data: preview.model3D
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating 3D model',
            error: error.message
        });
    }
};

// Update AR view
const updateARView = async (req, res) => {
    try {
        const { productId } = req.params;
        const { modelUrl, iosModelUrl, androidModelUrl, instructions } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        preview.arView = {
            enabled: true,
            modelUrl,
            iosModelUrl,
            androidModelUrl,
            instructions
        };

        await preview.save();

        res.json({
            success: true,
            message: 'AR view updated',
            data: preview.arView
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating AR view',
            error: error.message
        });
    }
};

// Update delivery preview
const updateDeliveryPreview = async (req, res) => {
    try {
        const { productId } = req.params;
        const { packagingType, packagingImages, dimensions, weight, unboxingExperience } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        preview.deliveryPreview = {
            enabled: true,
            packagingType,
            packagingImages,
            dimensions,
            weight,
            unboxingExperience
        };

        await preview.save();

        res.json({
            success: true,
            message: 'Delivery preview updated',
            data: preview.deliveryPreview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating delivery preview',
            error: error.message
        });
    }
};

// Add gift wrap option
const addGiftWrapOption = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, thumbnailUrl, price, description } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        if (!preview.giftWrapOptions) {
            preview.giftWrapOptions = [];
        }

        preview.giftWrapOptions.push({
            id: Date.now().toString(),
            name,
            thumbnailUrl,
            price,
            description
        });

        await preview.save();

        res.json({
            success: true,
            message: 'Gift wrap option added',
            data: preview.giftWrapOptions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding gift wrap option',
            error: error.message
        });
    }
};

// Update customization preview
const updateCustomizationPreview = async (req, res) => {
    try {
        const { productId } = req.params;
        const { previewImages, customizableAreas } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        preview.customizationPreview = {
            enabled: true,
            previewImages,
            customizableAreas
        };

        await preview.save();

        res.json({
            success: true,
            message: 'Customization preview updated',
            data: preview.customizationPreview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating customization preview',
            error: error.message
        });
    }
};

// Update video preview
const updateVideoPreview = async (req, res) => {
    try {
        const { productId } = req.params;
        const { videoUrl, thumbnailUrl, duration } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        preview.videoPreview = {
            enabled: true,
            videoUrl,
            thumbnailUrl,
            duration
        };

        await preview.save();

        res.json({
            success: true,
            message: 'Video preview updated',
            data: preview.videoPreview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating video preview',
            error: error.message
        });
    }
};

// Update interactive features
const updateInteractiveFeatures = async (req, res) => {
    try {
        const { productId } = req.params;
        const { zoomEnabled, panEnabled, hotspots } = req.body;

        let preview = await ProductPreview.findOne({ product: productId });
        if (!preview) {
            preview = await ProductPreview.create({ product: productId });
        }

        preview.interactiveFeatures = {
            zoomEnabled,
            panEnabled,
            hotspots
        };

        await preview.save();

        res.json({
            success: true,
            message: 'Interactive features updated',
            data: preview.interactiveFeatures
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating interactive features',
            error: error.message
        });
    }
};

// Delete product preview
const deleteProductPreview = async (req, res) => {
    try {
        const { productId } = req.params;

        const preview = await ProductPreview.findOneAndDelete({ product: productId });

        if (!preview) {
            return res.status(404).json({
                success: false,
                message: 'Product preview not found'
            });
        }

        res.json({
            success: true,
            message: 'Product preview deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting product preview',
            error: error.message
        });
    }
};

module.exports = {
    createProductPreview,
    getProductPreview,
    update3DModel,
    updateARView,
    updateDeliveryPreview,
    addGiftWrapOption,
    updateCustomizationPreview,
    updateVideoPreview,
    updateInteractiveFeatures,
    deleteProductPreview
};
