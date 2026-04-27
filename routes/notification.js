const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const { sendNotificationToTopic, sendNotificationToToken } = require('../config/firebase');

const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/', auth, adminAuth, async (req, res) => {
    const { title, message, imageUrl } = req.body;
    if (!title || !message) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }
    try {
        const newNotification = new Notification({ title, message, imageUrl });
        const notification = await newNotification.save();
        if (sendNotificationToTopic) {
            // Only add imageUrl to data if it exists
            const dataPayload = imageUrl ? { imageUrl } : {};
            await sendNotificationToTopic('all_users', title, message, dataPayload);
        }
        res.json(notification);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

router.post('/broadcast', auth, adminAuth, async (req, res) => {
    const { title, body, imageUrl, data } = req.body;
    if (!title || !body) {
        return res.status(400).json({ msg: 'Please provide title and body' });
    }
    try {
        const newNotification = new Notification({ title, message: body, imageUrl });
        await newNotification.save();
        if (sendNotificationToTopic) {
            await sendNotificationToTopic('all_users', title, body, { ...data, imageUrl });
        }
        res.json({ success: true, msg: 'Notification sent successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to send notification', error: err.message });
    }
});

router.post('/send-to-token', auth, adminAuth, async (req, res) => {
    const { token, title, body, data } = req.body;
    if (!token || !title || !body) {
        return res.status(400).json({ msg: 'Please provide token, title and body' });
    }
    try {
        const response = await sendNotificationToToken(token, title, body, data || {});
        res.json({ success: true, response });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to send notification', error: err.message });
    }
});

router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }
        await notification.deleteOne();
        res.json({ msg: 'Notification removed' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
