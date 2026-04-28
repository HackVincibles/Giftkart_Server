const mongoose = require('mongoose');

const CustomizationSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customizationType: {
        type: String,
        enum: ['photo-upload', 'text-engraving', 'color-change', 'size-adjustment', 'message-addition', 'full-custom'],
        required: true
    },
    uploadedImages: [{
        originalUrl: String,
        processedUrl: String,
        backgroundRemoved: Boolean,
        enhanced: Boolean,
        position: {
            x: Number,
            y: Number
        },
        size: {
            width: Number,
            height: Number
        },
        rotation: Number
    }],
    textCustomizations: [{
        fieldId: String,
        text: String,
        font: String,
        color: String,
        size: Number,
        position: {
            x: Number,
            y: Number
        },
        alignment: String
    }],
    colorCustomizations: [{
        fieldId: String,
        color: String,
        hexCode: String
    }],
    aiGeneratedContent: {
        message: {
            original: String,
            generated: String,
            tone: String,
            style: String
        },
        poem: {
            title: String,
            content: String,
            theme: String
        },
        caption: {
            text: String,
            style: String
        },
        story: {
            title: String,
            content: String,
            characters: [String]
        }
    },
    aiSuggestions: [{
        type: String,
        suggestion: String,
        confidence: Number,
        applied: Boolean
    }],
    frameStyle: {
        type: String,
        enum: ['wood', 'led', 'digital', 'metal', 'glass', 'none']
    },
    frameSize: {
        type: String,
        enum: ['small', 'medium', 'large', 'custom']
    },
    customDimensions: {
        width: Number,
        height: Number,
        depth: Number,
        unit: {
            type: String,
            default: 'cm'
        }
    },
    previewUrl: String,
    finalDesignUrl: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending'
    },
    creatorNotes: String,
    estimatedCompletionTime: Date,
    actualCompletionTime: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

CustomizationSchema.index({ order: 1 });
CustomizationSchema.index({ product: 1 });
CustomizationSchema.index({ user: 1 });
CustomizationSchema.index({ status: 1 });

module.exports = mongoose.model('Customization', CustomizationSchema);
