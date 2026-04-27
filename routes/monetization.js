const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const AdConfig = require('../models/AdConfig');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const ArtistPayout = require('../models/ArtistPayout');

// Middleware to check admin role
const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// ==========================================
// AD CONFIGURATION ROUTE
// ==========================================

// @route   GET /api/monetization/ads
// @desc    Get ad configuration
// @access  Public (App needs to know if ads are on)
router.get('/ads', async (req, res) => {
    try {
        let config = await AdConfig.findOne();
        if (!config) {
            // Create default if not exists
            config = new AdConfig();
            await config.save();
        }
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/monetization/ads
// @desc    Update ad configuration
// @access  Admin
router.post('/ads', auth, adminAuth, async (req, res) => {
    try {
        const { isEnabled, placements, frequency } = req.body;
        let config = await AdConfig.findOne();
        if (config) {
            config.isEnabled = isEnabled !== undefined ? isEnabled : config.isEnabled;
            config.placements = { ...config.placements, ...placements };
            config.frequency = { ...config.frequency, ...frequency };
            config.updatedAt = Date.now();
            await config.save();
        } else {
            config = new AdConfig(req.body);
            await config.save();
        }
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// SUBSCRIPTION PLANS ROUTES
// ==========================================

// @route   GET /api/monetization/plans
// @desc    Get all active plans
// @access  Public
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true });
        res.json(plans);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/monetization/plans
// @desc    Create a plan
// @access  Admin
router.post('/plans', auth, adminAuth, async (req, res) => {
    try {
        const newPlan = new SubscriptionPlan(req.body);
        await newPlan.save();
        res.json(newPlan);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/monetization/plans/:id
// @desc    Soft delete plan (set inactive)
// @access  Admin
router.delete('/plans/:id', auth, adminAuth, async (req, res) => {
    try {
        await SubscriptionPlan.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ msg: 'Plan deactivated' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ==========================================
// ARTIST PAYOUT ROUTES
// ==========================================

// @route   POST /api/monetization/payouts/request
// @desc    Request a payout (Artist)
// @access  Private
router.post('/payouts/request', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { amount } = req.body;

        if (user.walletBalance < amount) {
            return res.status(400).json({ msg: 'Insufficient wallet balance' });
        }

        const payout = new ArtistPayout({
            artist: req.user.id,
            amount
        });
        await payout.save();

        res.json(payout);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/monetization/payouts
// @desc    Get all payouts (Admin)
// @access  Admin
router.get('/payouts', auth, adminAuth, async (req, res) => {
    try {
        const payouts = await ArtistPayout.find().populate('artist', 'username email walletBalance').sort({ requestDate: -1 });
        res.json(payouts);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/monetization/payouts/:id
// @desc    Approve/Reject Payout
// @access  Admin
router.put('/payouts/:id', auth, adminAuth, async (req, res) => {
    const { status, transactionId, notes } = req.body;
    try {
        const payout = await ArtistPayout.findById(req.params.id);
        if (!payout) return res.status(404).json({ msg: 'Payout not found' });

        if (status === 'paid' && payout.status !== 'paid') {
            // Deduct from wallet ONLY if approved/paid now
            const artist = await User.findById(payout.artist);
            if (artist) {
                artist.walletBalance -= payout.amount;
                await artist.save();
            }
            payout.processedDate = Date.now();
        }

        payout.status = status;
        if (transactionId) payout.transactionId = transactionId;
        if (notes) payout.notes = notes;

        await payout.save();
        res.json(payout);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
