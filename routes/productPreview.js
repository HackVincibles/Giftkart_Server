const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/productPreviewController');
const { protect, authenticateSeller, authorize } = require('../middleware/auth');

// Public routes
router.get('/product/:productId', getProductPreview);

// Seller routes
router.post('/product/:productId', authenticateSeller, createProductPreview);
router.put('/product/:productId/3d-model', authenticateSeller, update3DModel);
router.put('/product/:productId/ar-view', authenticateSeller, updateARView);
router.put('/product/:productId/delivery-preview', authenticateSeller, updateDeliveryPreview);
router.post('/product/:productId/gift-wrap', authenticateSeller, addGiftWrapOption);
router.put('/product/:productId/customization', authenticateSeller, updateCustomizationPreview);
router.put('/product/:productId/video', authenticateSeller, updateVideoPreview);
router.put('/product/:productId/interactive', authenticateSeller, updateInteractiveFeatures);
router.delete('/product/:productId', authenticateSeller, deleteProductPreview);

module.exports = router;
