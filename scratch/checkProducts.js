const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function checkProducts() {
    await mongoose.connect(process.env.MONGODB_URI);
    const products = await Product.find({}, { name: 1, category: 1, aiTags: 1 }).limit(10);
    console.log('Sample Products:', JSON.stringify(products, null, 2));
    process.exit(0);
}

checkProducts();
