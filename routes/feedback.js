const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware'); // Optional if feedback can be anonymous
const admin = require('../middleware/adminMiddleware'); // For admin viewing

// POST /api/feedback - Submit feedback/help/rating
router.post('/', async (req, res) => {
    try {
        const { type, message, rating, userId } = req.body;

        let username = 'Anonymous';
        if (userId) {
            const user = await User.findById(userId);
            if (user) username = user.username;
        }

        const newFeedback = new Feedback({
            userId,
            username,
            type,
            message,
            rating
        });

        await newFeedback.save();
        res.json({ msg: 'Thank you for your feedback!' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/feedback/all - Get all feedback (Admin only)
router.get('/all', [auth, admin], async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/feedback/:id - Delete feedback (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        await Feedback.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Feedback deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
