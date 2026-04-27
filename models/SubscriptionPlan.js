const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    price: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    durationDays: {
        type: Number,
        required: true // e.g., 30 for Monthly, 365 for Yearly
    },
    features: {
        adFree: { type: Boolean, default: true },
        offlineDownload: { type: Boolean, default: true },
        highQualityAudio: { type: Boolean, default: true }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
