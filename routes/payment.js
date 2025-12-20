const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// @route   POST /api/payment/verify
// @desc    Verify payment and grant premium (Mock)
// @access  Private
router.post('/verify', auth, async (req, res) => {
    const { utr, plan } = req.body; // plan: 'monthly' or 'yearly'

    if (!utr || utr.length < 10) {
        return res.status(400).json({ msg: 'Invalid Transaction ID (UTR)' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // MOCK VERIFICATION LOGIC
        // In real app, check UTR against bank API.
        // Here we assume any 10+ char UTR starting with a number is valid for demo.

        user.isPremium = true;

        const now = new Date();
        if (plan === 'yearly') {
            now.setFullYear(now.getFullYear() + 1);
        } else {
            now.setMonth(now.getMonth() + 1);
        }
        user.premiumExpiry = now;

        await user.save();

        res.json({ msg: 'Payment Verified! Premium Activated.', isPremium: true, expiry: user.premiumExpiry });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
