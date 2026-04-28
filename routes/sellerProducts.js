const express = require('express');
const router = express.Router();
const {
    createProduct,
    updateProduct,
    getSellerProducts,
    deleteProduct,
    getCommissionInfo,
    calculatePricePreview
} = require('../controllers/sellerProductController');
const { authenticateSeller } = require('../middleware/auth');

// All routes require seller authentication
router.use(authenticateSeller);

router.post('/', createProduct);
router.get('/', getSellerProducts);
router.get('/commission-info', getCommissionInfo);
router.post('/calculate-price', calculatePricePreview);
router.put('/:productId', updateProduct);
router.delete('/:productId', deleteProduct);

module.exports = router;
