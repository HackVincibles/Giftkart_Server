const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Product = require('../models/Product');

async function seedData() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env file');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // 1. Create/Update Creator User
        const email = 'seller@gmail.com';
        const password = 'Seller@123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let seller = await User.findOne({ email });
        if (!seller) {
            seller = await User.create({
                name: 'Elite Creations',
                displayName: 'Elite Creations',
                email: email,
                password: hashedPassword,
                role: 'creator',
                creatorProfile: {
                    studioName: 'Elite Creations Studio',
                    bio: 'Premium handcrafted gifts and luxury products.',
                    isVerified: true
                }
            });
            console.log('Seller created successfully');
        } else {
            seller.role = 'creator';
            seller.password = hashedPassword;
            await seller.save();
            console.log('Seller user updated');
        }

        // 2. Clear existing products to ensure a fresh, clean set of perfect images
        await Product.deleteMany({ creator: seller._id });
        console.log('Cleared existing seller products for a fresh start...');

        // 3. Define Products (Master List - 55+ Items with Perfect Images)
        const products = [
            // --- ARTISANAL & HANDMADE (Priority) ---
            {
                name: 'Hand-Painted Mandala Wall Art',
                description: 'Intricate spiritual mandala on a wooden canvas.',
                category: 'standard', basePrice: 2800,
                images: [{ url: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1000', alt: 'Mandala' }],
                creator: seller._id, inventory: { stock: 15 },
                aiTags: [{ category: 'home-decor', confidence: 0.99 }, { category: 'creative', confidence: 0.95 }],
                popularity: { views: Math.floor(Math.random() * 500) + 200, orders: Math.floor(Math.random() * 50) + 20, wishlistCount: Math.floor(Math.random() * 40) + 15 }
            },
            {
                name: 'Terracotta Hand-Thown Vase',
                description: 'Rustic clay vase fired in a traditional kiln.',
                category: 'standard', basePrice: 1200,
                images: [{ url: 'https://images.unsplash.com/photo-1581781882709-9c655095039c?q=80&w=1000', alt: 'Vase' }],
                creator: seller._id, inventory: { stock: 20 },
                aiTags: [{ category: 'home-decor', confidence: 0.95 }]
            },
            {
                name: 'Hand-Woven Jute Rug',
                description: 'Natural fiber rug, braided by skilled artisans.',
                category: 'standard', basePrice: 3500,
                images: [{ url: 'https://images.unsplash.com/photo-1575414003591-ece8d0416c7a?q=80&w=1000', alt: 'Rug' }],
                creator: seller._id, inventory: { stock: 10 },
                aiTags: [{ category: 'home-decor', confidence: 0.9 }]
            },
            {
                name: 'Abstract Oil Painting - "Ocean Breeze"',
                description: 'Hand-painted large canvas with textured waves.',
                category: 'standard', basePrice: 5500,
                images: [{ url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1000', alt: 'Painting' }],
                creator: seller._id, inventory: { stock: 5 },
                aiTags: [{ category: 'creative', confidence: 0.99 }]
            },
            {
                name: 'Hand-Carved Walnut Jewelry Box',
                description: 'Intricate floral carvings on solid walnut wood.',
                category: 'standard', basePrice: 4200,
                images: [{ url: 'https://images.unsplash.com/photo-1582142407894-ec85a1260a46?q=80&w=1000', alt: 'Box' }],
                creator: seller._id, inventory: { stock: 12 },
                aiTags: [{ category: 'luxury-oriented', confidence: 0.9 }]
            },
            {
                name: 'Macramé Wall Hanging - Boho Chic',
                description: 'Hand-knotted cotton rope art on a driftwood branch.',
                category: 'standard', basePrice: 1850,
                images: [{ url: 'https://images.unsplash.com/photo-1528114039593-4366cc28228d?q=80&w=1000', alt: 'Macrame' }],
                creator: seller._id, inventory: { stock: 25 },
                aiTags: [{ category: 'home-decor', confidence: 0.99 }]
            },
            {
                name: 'Ceramic Glazed Tea Set',
                description: '4 cups and a teapot in a stunning emerald drip glaze.',
                category: 'standard', basePrice: 3200,
                images: [{ url: 'https://images.unsplash.com/photo-1576024266160-5906a948332a?q=80&w=1000', alt: 'Tea Set' }],
                creator: seller._id, inventory: { stock: 15 },
                aiTags: [{ category: 'minimalist', confidence: 0.95 }]
            },
            {
                name: 'Embroidered Linen Pillow Case',
                description: 'Traditional folk embroidery on pure linen.',
                category: 'standard', basePrice: 950,
                images: [{ url: 'https://images.unsplash.com/photo-1584132905271-512c958d674a?q=80&w=1000', alt: 'Pillow' }],
                creator: seller._id, inventory: { stock: 40 },
                aiTags: [{ category: 'creative', confidence: 0.9 }]
            },
            {
                name: 'Resin & Wood Coaster Set',
                description: 'Set of 6 coasters made of olive wood and blue resin.',
                category: 'standard', basePrice: 1450,
                images: [{ url: 'https://images.unsplash.com/photo-1610433554304-7c0c14486532?q=80&w=1000', alt: 'Coasters' }],
                creator: seller._id, inventory: { stock: 50 },
                aiTags: [{ category: 'minimalist', confidence: 0.85 }]
            },
            {
                name: 'Hand-Stitched Leather Journal',
                description: 'Vintage style leather with hand-bound deckle-edge paper.',
                category: 'standard', basePrice: 1600,
                images: [{ url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1000', alt: 'Journal' }],
                creator: seller._id, inventory: { stock: 30 },
                aiTags: [{ category: 'creative', confidence: 0.95 }]
            },

            // --- FASHION & CLOTHING ---
            {
                name: 'Royal Banarasi Silk Saree',
                description: 'Pure silk with heavy gold zari pallu.',
                category: 'standard', basePrice: 18000,
                images: [{ url: 'https://images.unsplash.com/photo-1610030469915-9a88e4701637?q=80&w=1000', alt: 'Saree' }],
                creator: seller._id, inventory: { stock: 20 },
                aiTags: [{ category: 'clothing', confidence: 0.99 }]
            },
            {
                name: 'Designer Cotton Kurta Set',
                description: 'Hand-block printed floral patterns on fine cotton.',
                category: 'standard', basePrice: 4500,
                images: [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1000', alt: 'Kurta' }],
                creator: seller._id, inventory: { stock: 50 },
                aiTags: [{ category: 'clothing', confidence: 0.95 }]
            },
            {
                name: 'Premium Woolen Pashmina Shawl',
                description: 'Authentic hand-woven pashmina from Kashmir.',
                category: 'standard', basePrice: 12500,
                images: [{ url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?q=80&w=1000', alt: 'Shawl' }],
                creator: seller._id, inventory: { stock: 15 },
                aiTags: [{ category: 'luxury-oriented', confidence: 0.99 }]
            },
            {
                name: 'Linen Button-Up Shirt',
                description: 'Perfect for summer, breathable and stylish.',
                category: 'standard', basePrice: 2200,
                images: [{ url: 'https://images.unsplash.com/photo-1596755094514-f87034a2612d?q=80&w=1000', alt: 'Shirt' }],
                creator: seller._id, inventory: { stock: 100 },
                aiTags: [{ category: 'clothing', confidence: 0.9 }]
            },

            // --- JEWELRY ---
            {
                name: 'Diamond Solitaire Ring',
                description: 'Elegant 18k gold band with certified diamond.',
                category: 'standard', basePrice: 85000,
                images: [{ url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1000', alt: 'Ring' }],
                creator: seller._id, inventory: { stock: 5 },
                aiTags: [{ category: 'luxury-oriented', confidence: 0.99 }]
            },
            {
                name: 'Emerald Tear-Drop Necklace',
                description: 'Stunning natural emerald in a silver frame.',
                category: 'standard', basePrice: 15500,
                images: [{ url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1000', alt: 'Necklace' }],
                creator: seller._id, inventory: { stock: 8 },
                aiTags: [{ category: 'luxury-oriented', confidence: 0.95 }]
            },

            // --- ELECTRONICS & GADGETS (Fixed Images) ---
            {
                name: 'Hi-Fi Vintage Turntable',
                description: 'Modern internals in a classic walnut casing.',
                category: 'standard', basePrice: 9500,
                images: [{ url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=1000', alt: 'Turntable' }],
                creator: seller._id, inventory: { stock: 20 },
                aiTags: [{ category: 'tech-savvy', confidence: 0.95 }]
            },
            {
                name: '4K Smart Home Projector',
                description: 'Ultra-bright projector for movie nights.',
                category: 'standard', basePrice: 24500,
                images: [{ url: 'https://images.unsplash.com/photo-1593305841991-05c297ba3269?q=80&w=1000', alt: 'Projector' }],
                creator: seller._id, inventory: { stock: 15 },
                aiTags: [{ category: 'tech-savvy', confidence: 0.99 }]
            },
            {
                name: 'Active Noise Cancelling Headphones',
                description: 'Top-tier sound isolation and 30h battery.',
                category: 'standard', basePrice: 18500,
                images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000', alt: 'Headphones' }],
                creator: seller._id, inventory: { stock: 60 },
                aiTags: [{ category: 'tech-savvy', confidence: 0.99 }]
            },
            {
                name: 'Smart Wellness Watch',
                description: 'Heart rate, SpO2, and fitness tracking.',
                category: 'standard', basePrice: 5500,
                images: [{ url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?q=80&w=1000', alt: 'Smartwatch' }],
                creator: seller._id, inventory: { stock: 150 },
                aiTags: [{ category: 'practical', confidence: 0.9 }]
            },

            // --- FOOD & TREATS ---
            {
                name: 'Artisanal Belgian Truffles',
                description: 'Box of 24 handcrafted assorted truffles.',
                category: 'standard', basePrice: 2200,
                images: [{ url: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?q=80&w=1000', alt: 'Truffles' }],
                creator: seller._id, inventory: { stock: 100 },
                aiTags: [{ category: 'foodie', confidence: 0.99 }]
            },
            {
                name: 'Gourmet Organic Tea Box',
                description: 'Assorted rare teas from Himalayan gardens.',
                category: 'standard', basePrice: 1500,
                images: [{ url: 'https://images.unsplash.com/photo-1594631252845-29fc458695d1?q=80&w=1000', alt: 'Tea' }],
                creator: seller._id, inventory: { stock: 200 },
                aiTags: [{ category: 'foodie', confidence: 0.9 }]
            },

            // --- MAKEUP ---
            {
                name: 'Premium Eyeshadow Palette',
                description: '32 highly pigmented shades for every look.',
                category: 'standard', basePrice: 3800,
                images: [{ url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1000', alt: 'Makeup' }],
                creator: seller._id, inventory: { stock: 45 },
                aiTags: [{ category: 'creative', confidence: 0.95 }]
            },
            {
                name: 'Hydrating Skincare Routine Set',
                description: 'Cleanser, toner, and moisturizer with Aloe Vera.',
                category: 'standard', basePrice: 2400,
                images: [{ url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=1000', alt: 'Skincare' }],
                creator: seller._id, inventory: { stock: 80 },
                aiTags: [{ category: 'practical', confidence: 0.85 }]
            },

            // --- TOYS & SPORTS ---
            {
                name: 'Remote Controlled Drone Pro',
                description: '4K camera with GPS auto-return.',
                category: 'standard', basePrice: 12500,
                images: [{ url: 'https://images.unsplash.com/photo-1524143980106-ad0548ca7f0d?q=80&w=1000', alt: 'Drone' }],
                creator: seller._id, inventory: { stock: 25 },
                aiTags: [{ category: 'tech-savvy', confidence: 0.95 }]
            },
            {
                name: 'Classic Wooden Chess Set',
                description: 'Large board with weighted wooden pieces.',
                category: 'standard', basePrice: 1850,
                images: [{ url: 'https://images.unsplash.com/photo-1611996591611-8855c966942a?q=80&w=1000', alt: 'Chess' }],
                creator: seller._id, inventory: { stock: 60 },
                aiTags: [{ category: 'creative', confidence: 0.9 }]
            }
        ];

        // Fill up more items dynamically to reach 60+
        const additionalItems = [
            { name: 'Bamboo Serving Tray Set', desc: 'Sustainably sourced bamboo, set of 3.', price: 1400, img: 'https://images.unsplash.com/photo-1563290021-36528d000c02?q=80&w=1000', cat: 'home-decor' },
            { name: 'Copper Moscow Mule Mugs', desc: 'Set of 4 hammered copper mugs.', price: 2800, img: 'https://images.unsplash.com/photo-1561053720-76cd73ff22c3?q=80&w=1000', cat: 'home-decor' },
            { name: 'Hand-Woven Flower Basket', desc: 'Beautiful wicker basket for gifting flowers.', price: 650, img: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=1000', cat: 'sentimental' },
            { name: 'Abstract Blue Wall Art', desc: 'Modern canvas print in deep blues.', price: 3200, img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000', cat: 'home-decor' },
            { name: 'Custom Photo Crystal', desc: 'Your photo laser-engraved in high-quality crystal.', price: 4500, img: 'https://images.unsplash.com/photo-1583847268964-b28dc2f51ac9?q=80&w=1000', cat: 'sentimental' },
            { name: 'Professional Paint Brush Set', desc: '15 varied brushes for all art mediums.', price: 850, img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000', cat: 'creative' },
            { name: 'Succulent Garden Bowl', desc: 'Large ceramic bowl with 5 variety succulents.', price: 1800, img: 'https://images.unsplash.com/photo-1520302630591-fd1c66ed11ef?q=80&w=1000', cat: 'minimalist' },
            { name: 'Premium Coffee Beans Box', desc: 'Three 250g bags of specialty roasted beans.', price: 2100, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1000', cat: 'foodie' },
            { name: 'Luxury Bath Bomb Set', desc: 'Set of 8 essential oil infused bath bombs.', price: 1200, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000', cat: 'sentimental' },
            { name: 'Vintage Leather Satchel', desc: 'Handcrafted full-grain leather laptop bag.', price: 6500, img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Electric Precision Kettle', desc: 'Temperature controlled gooseneck kettle.', price: 4200, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=1000', cat: 'practical' },
            { name: 'Gaming Mechanical Keyboard', desc: 'RGB backlit with silent switches.', price: 4800, img: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=1000', cat: 'tech-savvy' },
            { name: 'Professional Yoga Blocks', desc: 'Set of 2 high-density cork blocks.', price: 1100, img: 'https://images.unsplash.com/photo-1592432676556-2683e1a49908?q=80&w=1000', cat: 'practical' },
            { name: 'Terrarium Building Kit', desc: 'All materials to build your own mini garden.', price: 2500, img: 'https://images.unsplash.com/photo-1520302630591-fd1c66ed11ef?q=80&w=1000', cat: 'creative' },
            { name: 'Artisan Scented Candles', desc: 'Natural soy wax with essential oils.', price: 1500, img: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=1000', cat: 'home-decor' },
            { name: 'Watercolor Set for Artists', desc: '36 vibrant pans with water-fill brushes.', price: 2200, img: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=1000', cat: 'creative' },
            { name: 'Classic Hardcover Notebook', desc: 'Leather bound with 200 pages.', price: 950, img: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=1000', alt: 'Notebook', cat: 'practical' },
            { name: 'Digital Instant Print Camera', desc: 'Capture and print instantly.', price: 7500, img: 'https://images.unsplash.com/photo-1526170315870-ef68a2585938?q=80&w=1000', cat: 'creative' },
            { name: 'Copper Water Pitcher', desc: 'Traditional Ayurvedic copper pitcher.', price: 1800, img: 'https://images.unsplash.com/photo-1561053720-76cd73ff22c3?q=80&w=1000', cat: 'practical' },
            { name: 'Hand-Crafted Spice Box', desc: 'Wooden box with 7 compartments for spices.', price: 2400, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db06?q=80&w=1000', cat: 'home-decor' },
            { name: 'Designer Coffee Table Book', desc: 'Large format photography book of world art.', price: 3500, img: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=1000', cat: 'creative' },
            { name: 'Luxury Silk Tie Set', desc: 'Pure silk tie with matching pocket square.', price: 2500, img: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Exotic Flower Bouquet', desc: 'Rare orchids and lilies in a glass vase.', price: 3200, img: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=1000', cat: 'sentimental' },
            { name: 'Wireless Bluetooth Soundbar', desc: 'Immersive sound for your home theater.', price: 12500, img: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=1000', cat: 'tech-savvy' },
            { name: 'Personalized Leather Wallet', desc: 'Hand-stitched leather with your initials.', price: 1800, img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1000', cat: 'practical' },
            
            // --- NEW: PREMIUM AESTHETIC & HANDMADE (25+ MORE) ---
            { name: 'Vintage Oak Photo Frame', desc: 'Hand-crafted reclaimed oak frame for 8x10 photos.', price: 1850, img: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=1000', cat: 'home-decor' },
            { name: 'Minimalist Line Art Frame', desc: 'Elegant black wood frame with modern line art.', price: 2400, img: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1000', cat: 'minimalist' },
            { name: 'Golden Ornate Mirror Frame', desc: 'Baroque style hand-carved frame with gold leaf.', price: 8500, img: 'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Botanical Pressed Flower Frame', desc: 'Real dried wild flowers in a double-glass floating frame.', price: 1650, img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000', cat: 'sentimental' },
            { name: 'Abstract "Sunset" Wall Painting', desc: 'Original acrylic on canvas with vibrant textures.', price: 12500, img: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1000', cat: 'creative' },
            { name: 'Macramé Dreamcatcher Large', desc: 'Intricate hand-knotted cotton with goose feathers.', price: 2100, img: 'https://images.unsplash.com/photo-1528114039593-4366cc28228d?q=80&w=1000', cat: 'home-decor' },
            { name: 'Hand-Blown Murano Glass Vase', desc: 'Authentic Italian glass art in swirl patterns.', price: 15500, img: 'https://images.unsplash.com/photo-1610992015732-2449b0c26670?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Embroidered Silk Wall Tapestry', desc: 'Large silk panel with traditional oriental scenery.', price: 9200, img: 'https://images.unsplash.com/photo-1584132905271-512c958d674a?q=80&w=1000', cat: 'creative' },
            { name: 'Solid Brass Desk Calendar', desc: 'Luxury perpetual calendar with rotating dials.', price: 3800, img: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=1000', cat: 'practical' },
            { name: 'Hand-Forged Iron Wall Sconce', desc: 'Artisanal metal work for elegant candle lighting.', price: 4500, img: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1000', cat: 'home-decor' },
            { name: 'Teak Wood Multi-Photo Grid', desc: 'Holds 9 square photos in a grid layout.', price: 3200, img: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?q=80&w=1000', cat: 'sentimental' },
            { name: 'Ceramic Bonsai Pot - Hand Painted', desc: 'Stunning landscape painting on high-fire ceramic.', price: 2200, img: 'https://images.unsplash.com/photo-1599343332402-4b2a3f7f012a?q=80&w=1000', cat: 'minimalist' },
            { name: 'Luxury Velvet Jewelry Chest', desc: 'Silk-lined chest with secret compartments.', price: 6800, img: 'https://images.unsplash.com/photo-1582142407894-ec85a1260a46?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Seashell Mosaic Wall Art', desc: 'Original mosaic made from over 500 hand-picked shells.', price: 5400, img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000', cat: 'creative' },
            { name: 'Hand-Knitted Alpaca Throw', desc: 'Incredibly soft and warm throw for cold nights.', price: 7500, img: 'https://images.unsplash.com/photo-1575414003591-ece8d0416c7a?q=80&w=1000', cat: 'home-decor' },
            { name: 'Copper Etched World Map', desc: 'Large copper plate with etched cartography.', price: 18000, img: 'https://images.unsplash.com/photo-1561053720-76cd73ff22c3?q=80&w=1000', cat: 'creative' },
            { name: 'Resin Ocean Waves Serving Board', desc: 'Acacia wood board with 3D resin ocean waves.', price: 3500, img: 'https://images.unsplash.com/photo-1621431697207-6f8099880f01?q=80&w=1000', cat: 'practical' },
            { name: 'Shadow Box Frame for 3D Art', desc: 'Deep black frame for memorabilia and 3D objects.', price: 1450, img: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?q=80&w=1000', cat: 'home-decor' },
            { name: 'Japanese Ink Wash Painting', desc: 'Minimalist sumi-e painting on rice paper.', price: 4200, img: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1000', cat: 'minimalist' },
            { name: 'Crystal Geode Bookends', desc: 'Natural amethyst geodes polished to perfection.', price: 8900, img: 'https://images.unsplash.com/photo-1523467115858-9464c5384175?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Hand-Carved Soapstone Sculpture', desc: 'Intricate "Family Circle" design from soft soapstone.', price: 3200, img: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1000', cat: 'creative' },
            { name: 'Silver Filigree Photo Frame', desc: 'Exquisite hand-worked silver wire art.', price: 5500, img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1000', cat: 'luxury-oriented' },
            { name: 'Bamboo Chime with Glass Beads', desc: 'Melodic wind chime for garden or balcony.', price: 1200, img: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1000', cat: 'home-decor' },
            { name: 'Stained Glass Sun Catcher', desc: 'Vibrant geometric patterns in colored glass.', price: 2800, img: 'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1000', cat: 'creative' },
            { name: 'Luxury Leather Desk Mat', desc: 'Full-grain leather with suede backing.', price: 4500, img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1000', cat: 'practical' }
        ];

        additionalItems.forEach(item => {
            products.push({
                name: item.name,
                description: item.desc,
                category: 'standard',
                basePrice: item.price,
                images: [{ url: item.img, alt: item.name }],
                creator: seller._id,
                inventory: { stock: 50 },
                aiTags: [{ category: item.cat, confidence: 0.95 }],
                popularity: {
                    views: Math.floor(Math.random() * 500) + 100,
                    orders: Math.floor(Math.random() * 100) + 10,
                    wishlistCount: Math.floor(Math.random() * 50) + 5
                }
            });
        });

        for (const prod of products) {
            const p = new Product(prod);
            await p.save();
        }

        console.log(`Database seeded successfully with creator and ${products.length} products!`);
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seedData();
