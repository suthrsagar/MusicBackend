const mongoose = require('mongoose');

const adConfigSchema = new mongoose.Schema({
    isEnabled: {
        type: Boolean,
        default: true
    },
    placements: {
        homeBanner: { type: Boolean, default: true },
        playerInterstitial: { type: Boolean, default: true },
        searchBanner: { type: Boolean, default: true },
        playlistBanner: { type: Boolean, default: true }
    },
    adTypes: {
        banner: { type: Boolean, default: true },
        interstitial: { type: Boolean, default: true },
        rewarded: { type: Boolean, default: false }
    },
    frequency: {
        interstitialEvery: { type: Number, default: 5 } // Show interstitial every X songs
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AdConfig', adConfigSchema);
