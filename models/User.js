const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    avatar: {
        type: String,
        default: ''
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumExpiry: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Monetization Fields
    walletBalance: {
        type: Number,
        default: 0 // Earnings from streams
    },
    totalStreams: {
        type: Number,
        default: 0 // Total streams of uploaded songs
    },
    subscription: {
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        startDate: { type: Date },
        expiryDate: { type: Date },
        isActive: { type: Boolean, default: false }
    },
    currentSessionToken: {
        type: String,
        default: ''
    },
    isOnline: {
        type: Boolean,
        default: false
    }
});

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
