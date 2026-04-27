const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        unique: true
    },
    dau: {
        type: Number,
        default: 0
    },
    totalStreams: {
        type: Number,
        default: 0
    },
    totalDownloads: {
        type: Number,
        default: 0
    },
    newUsers: {
        type: Number,
        default: 0
    },
    revenue: {
        ads: { type: Number, default: 0 },
        subscriptions: { type: Number, default: 0 }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('DailyStats', dailyStatsSchema);
