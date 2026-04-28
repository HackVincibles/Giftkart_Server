const Customization = require('../models/Customization');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { messageGenerator } = require('../services/ai');

// AI Message Generator - Generates personalized messages, poems, captions
const generateAIMessage = async (req, res) => {
    try {
        const { 
            recipientName, 
            relationship, 
            occasion, 
            tone, 
            interests, 
            customPrompt,
            messageType // 'message', 'poem', 'caption', 'story'
        } = req.body;

        let result;
        
        // Use AI service based on message type (now async with Gemini)
        switch (messageType) {
            case 'poem':
                result = await messageGenerator.generatePoem({
                    recipientName,
                    relationship,
                    occasion,
                    tone,
                    interests
                });
                break;
            case 'caption':
                result = await messageGenerator.generateCaption({
                    recipientName,
                    relationship,
                    occasion,
                    tone
                });
                break;
            case 'story':
                result = await messageGenerator.generateStory({
                    recipientName,
                    relationship,
                    occasion,
                    tone,
                    interests
                });
                break;
            default:
                result = await messageGenerator.generateMessage({
                    recipientName,
                    relationship,
                    occasion,
                    tone,
                    interests,
                    customPrompt
                });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating AI message',
            error: error.message
        });
    }
};

// AI Image Enhancement Request - Prepares image processing request
const requestImageEnhancement = async (req, res) => {
    try {
        const { imageUrl, operations } = req.body;
        // operations: ['background-removal', 'enhance', 'resize', 'compress']
        
        // This would typically send the image to a Python microservice
        // For now, returning a mock response structure
        
        const enhancementId = `enh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        res.json({
            success: true,
            data: {
                enhancementId,
                status: 'processing',
                originalUrl: imageUrl,
                operations,
                estimatedTime: '30 seconds',
                message: 'Image enhancement request submitted. Use the enhancementId to check status.'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error requesting image enhancement',
            error: error.message
        });
    }
};

// Check image enhancement status
const checkEnhancementStatus = async (req, res) => {
    try {
        const { enhancementId } = req.params;
        
        // This would check the actual status from the Python microservice
        // For now, returning a mock response
        
        res.json({
            success: true,
            data: {
                enhancementId,
                status: 'completed',
                processedUrl: `https://example.com/processed/${enhancementId}.jpg`,
                operationsPerformed: ['background-removal', 'enhance'],
                processingTime: '28 seconds'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking enhancement status',
            error: error.message
        });
    }
};

// Custom Gift Builder - Combines multiple items into a custom gift box
const buildCustomGift = async (req, res) => {
    try {
        const {
            items, // Array of product IDs
            boxType, // 'standard', 'premium', 'luxury'
            customMessage,
            wrappingStyle,
            addOns
        } = req.body;

        // Validate items exist
        const Product = require('../models/Product');
        const products = await Product.find({ _id: { $in: items } });
        
        if (products.length !== items.length) {
            return res.status(400).json({
                success: false,
                message: 'Some products not found'
            });
        }

        // Calculate total price
        const basePrice = products.reduce((sum, p) => sum + p.pricing.base, 0);
        const boxPrices = {
            standard: 50,
            premium: 150,
            luxury: 300
        };
        const totalPrice = basePrice + boxPrices[boxType] + (addOns?.length * 25 || 0);

        // AI suggestions for the combination
        const aiSuggestions = [];
        if (products.length > 1) {
            aiSuggestions.push('Consider adding a personal note to tie these items together');
            if (products.some(p => p.category === 'semi-custom')) {
                aiSuggestions.push('Some items can be customized - add photos or text for a personal touch');
            }
        }

        res.json({
            success: true,
            data: {
                items: products,
                boxType,
                totalPrice,
                customMessage,
                wrappingStyle,
                addOns: addOns || [],
                aiSuggestions,
                estimatedDelivery: '3-5 business days',
                previewUrl: `https://example.com/preview/${Date.now()}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error building custom gift',
            error: error.message
        });
    }
};

// Get AI suggestions for customization
const getCustomizationSuggestions = async (req, res) => {
    try {
        const { productId, userContext } = req.body;
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const suggestions = [];

        // Suggest based on customizable fields
        product.customizableFields.forEach(field => {
            if (field.fieldType === 'text') {
                suggestions.push({
                    type: 'text',
                    field: field.fieldName,
                    suggestion: `Add a heartfelt message for ${field.fieldName}`,
                    examples: ['Happy Birthday!', 'With Love', 'Best Wishes', 'Forever Yours']
                });
            } else if (field.fieldType === 'image') {
                suggestions.push({
                    type: 'image',
                    field: field.fieldName,
                    suggestion: `Upload a memorable photo for ${field.fieldName}`,
                    tips: ['Use high-resolution images', 'Ensure good lighting', 'Choose photos with clear subjects']
                });
            } else if (field.fieldType === 'color') {
                suggestions.push({
                    type: 'color',
                    field: field.fieldName,
                    suggestion: `Choose colors that match the recipient's preference`,
                    popularColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
                });
            }
        });

        // AI-powered suggestions based on product category
        if (product.category === 'semi-custom') {
            suggestions.push({
                type: 'ai',
                suggestion: 'Let AI generate a personalized message for this gift',
                action: 'use-ai-message-generator'
            });
        }

        res.json({
            success: true,
            data: {
                productId,
                suggestions,
                totalCustomizableFields: product.customizableFields.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting customization suggestions',
            error: error.message
        });
    }
};

// Voice to Message - Prepare for voice-to-text conversion
const prepareVoiceToMessage = async (req, res) => {
    try {
        const { audioUrl, language } = req.body;
        
        // This would send audio to a speech-to-text service
        // For now, returning the structure
        
        const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        res.json({
            success: true,
            data: {
                transcriptionId,
                status: 'processing',
                language: language || 'en-IN',
                estimatedTime: '15 seconds',
                message: 'Voice transcription in progress. Use transcriptionId to retrieve the text.'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error preparing voice transcription',
            error: error.message
        });
    }
};

// Get voice transcription result
const getVoiceTranscription = async (req, res) => {
    try {
        const { transcriptionId } = req.params;
        
        // This would retrieve the actual transcription
        // For now, returning a mock response
        
        res.json({
            success: true,
            data: {
                transcriptionId,
                status: 'completed',
                text: 'Happy birthday mom! I love you so much and wanted to get you something special. You mean the world to me.',
                confidence: 0.95,
                language: 'en-IN'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting transcription',
            error: error.message
        });
    }
};

// Memory-based scrapbook generator
const generateMemoryScrapbook = async (req, res) => {
    try {
        const { memories, theme, title } = req.body;
        
        // memories: Array of { text, imageUrl, date }
        
        const scrapbookId = `scrap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        res.json({
            success: true,
            data: {
                scrapbookId,
                status: 'processing',
                title: title || 'Our Memories',
                theme: theme || 'classic',
                memoryCount: memories.length,
                estimatedTime: '2-3 minutes',
                message: 'Scrapbook generation in progress. AI will arrange memories beautifully.'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating scrapbook',
            error: error.message
        });
    }
};

module.exports = {
    generateAIMessage,
    requestImageEnhancement,
    checkEnhancementStatus,
    buildCustomGift,
    getCustomizationSuggestions,
    prepareVoiceToMessage,
    getVoiceTranscription,
    generateMemoryScrapbook
};
