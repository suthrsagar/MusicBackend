const mongoose = require('mongoose');

const SupportChatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One support thread per user for simplicity
    },
    username: {
        type: String, // Cache username for list view
        required: true
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    messages: [
        {
            sender: { type: String, enum: ['user', 'admin'], required: true },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('SupportChat', SupportChatSchema);
