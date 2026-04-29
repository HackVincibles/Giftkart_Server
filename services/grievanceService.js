const Grievance = require('../models/Grievance');
const Policy = require('../models/Policy');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const geminiService = require('./geminiService');
const { sendEmail } = require('./emailService');

/**
 * AI Grievance Resolver - Phase 6
 * Automatically analyzes and resolves customer complaints based on platform policies.
 */
class GrievanceResolver {
    /**
     * Analyze a new grievance
     */
    async analyzeGrievance(grievanceId) {
        const grievance = await Grievance.findById(grievanceId).populate('user order');
        if (!grievance) return;

        console.log(`Analyzing grievance: ${grievance.subject}`);

        // 1. Fetch relevant policies
        const policies = await Policy.find({ isActive: true });
        const policyText = policies.map(p => `${p.type.toUpperCase()}: ${p.content}`).join('\n');

        // 2. Prepare context for AI
        const prompt = `You are the GiftKart AI Ombudsman.
        Customer: ${grievance.user.displayName}
        Category: ${grievance.category}
        Subject: ${grievance.subject}
        Description: ${grievance.description}
        
        Platform Policies:
        ${policyText}

        Task:
        1. Determine if this grievance qualifies for an AUTOMATIC RESOLUTION (e.g., refund for late delivery).
        2. If YES, return JSON: {"autoResolve": true, "action": "refund", "amountPercent": 100, "reason": "...", "message": "..."}
        3. If NO (requires human review), return JSON: {"autoResolve": false, "reason": "Requires manual inspection of evidence"}

        Return ONLY the JSON.`;

        const result = await geminiService.generateText(prompt);
        try {
            const analysis = JSON.parse(result.match(/\{[\s\S]*\}/)[0]);
            
            if (analysis.autoResolve) {
                await this.executeAutoResolution(grievance, analysis);
            } else {
                grievance.status = 'in_progress';
                grievance.messages.push({
                    senderType: 'system',
                    message: 'Our AI has analyzed your request. A human agent will review the details shortly to ensure a fair resolution.',
                    timestamp: new Date()
                });
                await grievance.save();
            }
        } catch (e) {
            console.error('AI Analysis Parse Error:', e);
        }
    }

    /**
     * Execute the automatic resolution (e.g., refund)
     */
    async executeAutoResolution(grievance, analysis) {
        console.log(`Executing auto-resolution for ${grievance._id}: ${analysis.action}`);

        if (analysis.action === 'refund' && grievance.order) {
            const refundAmount = (grievance.order.totalAmount * analysis.amountPercent) / 100;
            
            // Process Refund to Wallet
            const wallet = await Wallet.findOne({ user: grievance.user._id });
            if (wallet) {
                wallet.balance += refundAmount;
                await wallet.save();

                await Transaction.create({
                    user: grievance.user._id,
                    amount: refundAmount,
                    type: 'credit',
                    status: 'completed',
                    description: `AI Auto-Refund for Grievance #${grievance._id}`
                });
            }
        }

        // Update Grievance Status
        grievance.status = 'resolved';
        grievance.resolution = {
            resolved: true,
            resolvedAt: new Date(),
            resolutionDetails: `[AI AUTO-RESOLVE] ${analysis.reason}`
        };
        grievance.messages.push({
            senderType: 'system',
            message: analysis.message || `We have automatically resolved this issue based on our policies. ${analysis.reason}`,
            timestamp: new Date()
        });

        await grievance.save();
        await this.notifyUser(grievance, analysis.message);
    }

    async notifyUser(grievance, message) {
        await sendEmail({
            email: grievance.user.email,
            subject: `✅ Grievance Resolved: ${grievance.subject}`,
            html: `<h2>Good News!</h2>
                   <p>Your grievance has been automatically resolved by our AI support system.</p>
                   <p><b>Resolution:</b> ${message}</p>
                   <p>Thank you for your patience.</p>`
        });
    }
}

module.exports = new GrievanceResolver();
