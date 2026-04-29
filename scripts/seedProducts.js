const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/Product');
const User = require('../models/User');

const seedProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find or create a dummy creator
        let creator = await User.findOne({ role: 'creator' });
        if (!creator) {
            creator = await User.create({
                displayName: 'Master Artisan',
                email: 'artisan@giftkart.com',
                password: 'password123',
                role: 'creator',
                authMethod: 'local',
                creatorProfile: {
                    studioName: 'Artisan Studio',
                    bio: 'Master of custom woodworks and memory scrapbooks.'
                }
            });
            console.log('Created dummy creator:', creator.email);
        }

        const products = [
            {
                name: 'Custom Engraved Wooden Frame',
                description: 'A premium hand-crafted wooden frame made from sustainable teak wood. Features high-quality laser engraving for your special messages.',
                basePrice: 1200,
                category: 'semi-custom',
                creator: creator._id,
                images: [{ url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800' }],
                customizationOptions: [
                    { fieldName: 'message', label: 'Engraving Message', type: 'text', placeholder: 'Enter your message here' },
                    { fieldName: 'font', label: 'Font Style', type: 'select', options: ['Classic', 'Modern', 'Handwritten'] }
                ],
                inventory: { stockCount: 50 },
                isActive: true,
                averageRating: 4.8
            },
            {
                name: 'AI Generated Memory Scrapbook',
                description: 'Our advanced AI analyzes your photos and stories to curate a beautiful physical scrapbook that captures the essence of your memories.',
                basePrice: 2500,
                category: 'ai-generated',
                creator: creator._id,
                images: [{ url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800' }],
                customizationOptions: [
                    { fieldName: 'occasion', label: 'Occasion', type: 'text', placeholder: 'e.g. Anniversary 2023' },
                    { fieldName: 'theme', label: 'Color Theme', type: 'select', options: ['Pastel', 'Vintage', 'Vibrant'] }
                ],
                inventory: { stockCount: 100 },
                isActive: true,
                averageRating: 4.9
            },
            {
                name: 'Hand-Painted Ceramic Mug',
                description: 'Each mug is hand-painted by artists with unique emotional motifs. Dishwasher safe and incredibly durable.',
                basePrice: 850,
                category: 'standard',
                creator: creator._id,
                images: [{ url: 'https://images.unsplash.com/photo-1514228742587-6b1558fbed50?auto=format&fit=crop&q=80&w=800' }],
                customizationOptions: [
                    { fieldName: 'initials', label: 'Custom Initials', type: 'text', placeholder: 'A.B.' }
                ],
                inventory: { stockCount: 30 },
                isActive: true,
                averageRating: 4.7
            }
        ];

        // Clean existing products first (optional, but good for testing)
        // await Product.deleteMany({});

        for (const p of products) {
            const exists = await Product.findOne({ name: p.name });
            if (!exists) {
                await Product.create(p);
                console.log('Seeded product:', p.name);
            } else {
                console.log('Product already exists:', p.name);
            }
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};

seedProducts();
