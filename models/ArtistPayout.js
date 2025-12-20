const mongoose = require('mongoose');

const artistPayoutSchema = new mongoose.Schema({
    artist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'paid'],
        default: 'pending'
    },
    requestDate: {
        type: Date,
        default: Date.now
    },
    processedDate: {
        type: Date
    },
    transactionId: {
        type: String // To store bank or payment gateway reference
    },
    notes: {
        type: String // Admin notes
    }
});

module.exports = mongoose.model('ArtistPayout', artistPayoutSchema);
