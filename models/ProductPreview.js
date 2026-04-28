const mongoose = require('mongoose');

const productPreviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        unique: true
    },
    
    // 3D Model
    model3D: {
        enabled: {
            type: Boolean,
            default: false
        },
        modelUrl: String,
        thumbnailUrl: String,
        format: {
            type: String,
            enum: ['gltf', 'glb', 'obj', 'fbx'],
            default: 'glb'
        },
        scale: {
            type: Number,
            default: 1
        },
        rotationSpeed: {
            type: Number,
            default: 1
        },
        autoRotate: {
            type: Boolean,
            default: true
        },
        cameraPositions: [{
            position: { x: Number, y: Number, z: Number },
            target: { x: Number, y: Number, z: Number },
            label: String
        }]
    },
    
    // AR View
    arView: {
        enabled: {
            type: Boolean,
            default: false
        },
        modelUrl: String,
        iosModelUrl: String, // USDZ for iOS
        androidModelUrl: String, // GLB for Android
        instructions: String
    },
    
    // Delivery Preview
    deliveryPreview: {
        enabled: {
            type: Boolean,
            default: false
        },
        packagingType: {
            type: String,
            enum: ['standard', 'gift_box', 'premium_box', 'custom']
        },
        packagingImages: [String],
        dimensions: {
            length: Number,
            width: Number,
            height: Number,
            unit: { type: String, default: 'cm' }
        },
        weight: {
            value: Number,
            unit: { type: String, default: 'kg' }
        },
        unboxingExperience: {
            hasRibbon: Boolean,
            hasTissuePaper: Boolean,
            hasCard: Boolean,
            hasSticker: Boolean
        }
    },
    
    // Gift Wrap Options
    giftWrapOptions: [{
        id: String,
        name: String,
        thumbnailUrl: String,
        price: Number,
        description: String
    }],
    
    // Customization Preview
    customizationPreview: {
        enabled: {
            type: Boolean,
            default: false
        },
        previewImages: [String],
        customizableAreas: [{
            name: String,
            x: Number,
            y: Number,
            width: Number,
            height: Number,
            type: {
                type: String,
                enum: ['text', 'image', 'color']
            }
        }]
    },
    
    // Video Preview
    videoPreview: {
        enabled: {
            type: Boolean,
            default: false
        },
        videoUrl: String,
        thumbnailUrl: String,
        duration: Number
    },
    
    // Interactive Features
    interactiveFeatures: {
        zoomEnabled: {
            type: Boolean,
            default: true
        },
        panEnabled: {
            type: Boolean,
            default: true
        },
        hotspots: [{
            position: { x: Number, y: Number },
            title: String,
            description: String,
            imageUrl: String
        }]
    },
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
productPreviewSchema.index({ 'model3D.enabled': 1 });
productPreviewSchema.index({ 'arView.enabled': 1 });

module.exports = mongoose.model('ProductPreview', productPreviewSchema);
