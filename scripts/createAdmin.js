/**
 * Admin Seeder Script
 * Run: node scripts/createAdmin.js
 * Creates a default admin user if one doesn't exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const createAdmin = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await User.findOne({ role: 'admin' });
        if (existing) {
            console.log(`⚠️  Admin already exists: ${existing.email}`);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@123', salt);

        const admin = await User.create({
            displayName: 'GiftKart Admin',
            email: 'admin@giftkart.com',
            password: hashedPassword,
            role: 'admin',
            authMethod: 'local'
        });

        console.log('✅ Admin created successfully!');
        console.log(`   Email:    ${admin.email}`);
        console.log(`   Password: Admin@123`);
        console.log(`   Role:     ${admin.role}`);
        console.log('\n⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!');

    } catch (err) {
        console.error('❌ Error creating admin:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createAdmin();
