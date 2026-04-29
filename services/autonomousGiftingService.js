const AutoGiftCalendar = require('../models/AutoGiftCalendar');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const geminiService = require('./geminiService');
const { sendEmail } = require('./emailService');
const mongoose = require('mongoose');

/**
 * Autonomous Gifting Service - Phase 6
 * This service manages the "Set and Forget" gifting lifecycle.
 */
class AutonomousGiftingService {
    /**
     * Run the daily autonomous processing loop
     */
    async processAutonomousQueue() {
        console.log('--- STARTING AUTONOMOUS Gifting LOOP ---');
        const today = new Date();
        
        // Find all active schedules that are autonomous and need action
        // Action is needed if suggestedOrderDate is today or past, and no order exists
        const schedules = await AutoGiftCalendar.find({
            status: 'active',
            isAutonomous: true,
            orderStatus: 'pending',
            'deliveryEstimation.suggestedOrderDate': { $lte: today }
        }).populate('user');

        console.log(`Found ${schedules.length} schedules to process.`);

        for (const schedule of schedules) {
            try {
                await this.processSchedule(schedule);
            } catch (error) {
                console.error(`Error processing schedule ${schedule._id}:`, error);
            }
        }
        console.log('--- AUTONOMOUS Gifting LOOP COMPLETED ---');
    }

    /**
     * Process a single autonomous schedule
     */
    async processSchedule(schedule) {
        console.log(`Processing autonomous gift for ${schedule.recipient.name} (${schedule.occasion})`);

        // 1. AI Gift Selection (if not already selected)
        if (!schedule.selectedGifts || schedule.selectedGifts.length === 0) {
            const selectedProduct = await this.selectGiftWithAI(schedule);
            if (!selectedProduct) {
                console.log(`Failed to select gift for ${schedule.recipient.name}. Skipping.`);
                return;
            }
            
            schedule.selectedGifts = [{
                product: selectedProduct._id,
                quantity: 1,
                message: `Happy ${schedule.occasion}! Hope you love this surprise.`
            }];
            await schedule.save();
        }

        // 2. Auto-Checkout (if approval is not required)
        if (!schedule.approvalRequired) {
            await this.executeAutoOrder(schedule);
        } else {
            // Send reminder to approve
            await this.sendApprovalRequiredNotification(schedule);
        }
    }

    /**
     * Use Gemini to select the best gift from available inventory
     */
    async selectGiftWithAI(schedule) {
        const products = await Product.find({ isActive: true }).limit(50);
        const budget = schedule.autoSelectionCriteria?.maxBudget || 2000;

        const productContext = products.map(p => ({
            id: p._id,
            name: p.name,
            price: p.basePrice,
            description: p.description,
            tags: p.aiTags?.map(t => t.tag)
        }));

        const prompt = `You are the GiftKart Autonomous AI. 
        Recipient: ${schedule.recipient.name}
        Relationship: ${schedule.recipient.relationship}
        Occasion: ${schedule.occasion}
        Budget: Up to ₹${budget}
        Available Products: ${JSON.stringify(productContext)}

        Select the single best product ID from the list that fits the occasion and relationship.
        Return ONLY the Product ID. No extra text.`;

        const result = await geminiService.generateText(prompt);
        const productId = result.trim();

        if (mongoose.Types.ObjectId.isValid(productId)) {
            return await Product.findById(productId);
        }
        return products[0]; // Fallback to first product
    }

    /**
     * Automatically place the order and deduct from wallet
     */
    async executeAutoOrder(schedule) {
        const user = schedule.user;
        const product = await Product.findById(schedule.selectedGifts[0].product);
        const totalAmount = product.basePrice;

        const wallet = await Wallet.findOne({ user: user._id });
        if (!wallet || wallet.balance < totalAmount) {
            console.log(`Insufficient balance for user ${user.email}. Skipping.`);
            await this.notifyInsufficientBalance(schedule);
            return;
        }

        // Deduct from wallet
        wallet.balance -= totalAmount;
        await wallet.save();

        // Create transaction
        await Transaction.create({
            user: user._id,
            amount: totalAmount,
            type: 'debit',
            status: 'completed',
            description: `Autonomous Order: ${schedule.occasion} for ${schedule.recipient.name}`
        });

        // Create Order
        const order = await Order.create({
            buyer: user._id,
            products: [{
                product: product._id,
                quantity: 1,
                priceAtPurchase: product.basePrice,
                creator: product.creator
            }],
            totalAmount,
            shippingAddress: schedule.deliveryAddress,
            paymentStatus: 'paid',
            orderStatus: 'ordered'
        });

        // Update schedule
        schedule.orderStatus = 'ordered';
        schedule.orderId = order._id;
        schedule.paymentStatus = 'paid';
        await schedule.save();

        console.log(`Autonomous Order ${order._id} placed successfully!`);
        await this.notifySuccess(schedule, order);
    }

    async sendApprovalRequiredNotification(schedule) {
        await sendEmail({
            email: schedule.user.email,
            subject: `🎁 Action Required: Approve Auto-Gift for ${schedule.recipient.name}`,
            html: `<h2>Your Gift is Ready!</h2>
                   <p>Our AI has selected a gift for ${schedule.recipient.name}'s ${schedule.occasion}.</p>
                   <p>Please log in to your dashboard to approve or change the gift before we process the order.</p>`
        });
    }

    async notifyInsufficientBalance(schedule) {
        await sendEmail({
            email: schedule.user.email,
            subject: `⚠️ Wallet Alert: Auto-Gift Failed`,
            html: `<h2>Autonomous Gifting Interrupted</h2>
                   <p>We tried to process your auto-gift for ${schedule.recipient.name}, but your wallet balance is insufficient.</p>
                   <p>Please top up your wallet to ensure the gift arrives on time.</p>`
        });
    }

    async notifySuccess(schedule, order) {
        await sendEmail({
            email: schedule.user.email,
            subject: `✨ Magic! Your Auto-Gift has been Ordered`,
            html: `<h2>Surprise on the way!</h2>
                   <p>Your autonomous gift for ${schedule.recipient.name}'s ${schedule.occasion} has been ordered successfully.</p>
                   <p>Order ID: <b>${order._id}</b></p>
                   <p>No further action is required from your side.</p>`
        });
    }
}

module.exports = new AutonomousGiftingService();
