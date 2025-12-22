const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    type: {
        type: String,
        enum: ['feedback', 'help', 'rate'],
        required: true
    },
    message: {
        type: String,
        required: false
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: false
    },
    username: {
        type: String,
        required: false // Stored for display convenience
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
