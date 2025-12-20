const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const { sendNotificationToTopic, sendNotificationToToken } = require('../config/firebase');

const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log(`❌ Auth Error: User ${req.user.id} not found`);
            return res.status(404).json({ msg: 'User not found' });
        }

        console.log(`👤 User Check: ${user.email} (Role: ${user.role})`);

        if (user.role !== 'admin') {
            console.log(`🚫 Access Denied for ${user.email}: Not an admin`);
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        console.log(`✅ Admin Access Granted for ${user.email}`);
        next();
    } catch (err) {
        console.error('❌ Admin Auth Error:', err);
        res.status(500).send('Server Error');
    }
};

// @route   GET /api/notifications
// @desc    Get all notifications (Newest first)
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
router.post('/', auth, adminAuth, async (req, res) => {
    console.log('--- NEW NOTIFICATION REQUEST ---');
    console.log('Body:', req.body);
    console.log('User ID:', req.user.id);

    const { title, message } = req.body;

    if (!title || !message) {
        console.log('❌ Validation Failed: Missing title or message');
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        console.log('💾 Saving to Database...');
        const newNotification = new Notification({
            title,
            message
        });

        const notification = await newNotification.save();
        console.log('✅ Saved to DB:', notification._id);

        if (sendNotificationToTopic) {
            console.log(`🚀 Dispatching FCM to topic 'all_users' via Firebase Admin...`);
            const fcmResponse = await sendNotificationToTopic('all_users', title, message);
            console.log('📲 FCM Response:', fcmResponse);
        } else {
            console.error('⚠️ sendNotificationToTopic function not found!');
        }

        res.json(notification);
    } catch (err) {
        console.error('❌ Notification Route Error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST /api/notifications/broadcast
// @desc    Send notification to ALL users (Admin only)
router.post('/broadcast', auth, adminAuth, async (req, res) => {
    const { title, body, data } = req.body;

    if (!title || !body) {
        return res.status(400).json({ msg: 'Please provide title and body' });
    }

    try {
        // 1. Save to Database
        const newNotification = new Notification({
            title,
            message: body
        });
        await newNotification.save();

        // 2. Send via Firebase Topic
        if (sendNotificationToTopic) {
            await sendNotificationToTopic('all_users', title, body, data || {});
        }

        res.json({ success: true, msg: 'Broadcast sent successfully' });
    } catch (err) {
        console.error('Broadcast Error:', err);
        res.status(500).json({ msg: 'Failed to send broadcast', error: err.message });
    }
});

// @route   POST /api/notifications/send-to-token
// @desc    Send notification to a specific device (Admin only for arbitrary tokens)
router.post('/send-to-token', auth, adminAuth, async (req, res) => {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
        return res.status(400).json({ msg: 'Please provide token, title and body' });
    }

    try {
        const response = await sendNotificationToToken(token, title, body, data || {});
        res.json({ success: true, response });
    } catch (err) {
        console.error('Direct Notification Error:', err);
        res.status(500).json({ msg: 'Failed to send notification', error: err.message });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        await notification.deleteOne();
        res.json({ msg: 'Notification removed' });
    } catch (err) {
        console.error(err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Notification not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
