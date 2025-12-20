const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware'); // Assuming you have this
const User = require('../models/User'); // To check admin role

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

// @route   GET /api/notifications
// @desc    Get all notifications (Newest first)
// @access  Public (or Private) -> Let's make it Public or readable by any logged in user
router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/notifications
// @desc    Create a notification (Admin only)
// @access  Private + Admin
router.post('/', auth, adminAuth, async (req, res) => {
    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        const newNotification = new Notification({
            title,
            message
        });

        const notification = await newNotification.save();
        res.json(notification);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
