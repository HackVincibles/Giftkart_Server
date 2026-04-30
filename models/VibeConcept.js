const mongoose = require('mongoose');

const VibeConceptSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vibeInput: {
        type: String,
        required: true
    },
    blueprint: {
        prototypeName: String,
        tagline: String,
        concept: String,
        materials: [String],
        craftingSteps: [String],
        aestheticPalette: [String],
        suggestedPrice: String,
        vibeScore: Number
    },
    assignedCreator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'realizing', 'completed'],
        default: 'sent'
    },
    canvasState: {
        elements: Array // Stores the drag-and-drop state once a creator starts working
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('VibeConcept', VibeConceptSchema);
