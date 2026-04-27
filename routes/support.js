const express = require('express');
const router = express.Router();
const SupportChat = require('../models/SupportChat');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// --- USER ROUTES ---

// GET /api/support/my-chat - Get current user's chat history
router.get('/my-chat', auth, async (req, res) => {
    try {
        let chat = await SupportChat.findOne({ userId: req.user.id });
        if (!chat) {
            // Return empty structure or create one? Let's return null or empty messages
            return res.json({ messages: [] });
        }
        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/support/send - User sends a message
router.post('/send', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ msg: 'Message is required' });

        let chat = await SupportChat.findOne({ userId: req.user.id });

        if (!chat) {
            const user = await User.findById(req.user.id);
            chat = new SupportChat({
                userId: req.user.id,
                username: user.username,
                messages: []
            });
        }

        const newMessage = {
            sender: 'user',
            text: text,
            createdAt: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastMessage = text;
        chat.lastUpdated = new Date();
        await chat.save();

        res.json(chat);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- ADMIN ROUTES ---

// GET /api/support/admin/all - Get all support chats
router.get('/admin/all', [auth, admin], async (req, res) => {
    try {
        const chats = await SupportChat.find().sort({ lastUpdated: -1 });
        res.json(chats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/support/admin/chat/:userId - Get specific user chat for admin
router.get('/admin/chat/:userId', [auth, admin], async (req, res) => {
    try {
        const chat = await SupportChat.findOne({ userId: req.params.userId });
        if (!chat) return res.status(404).json({ msg: 'Chat not found' });
        res.json(chat);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/support/admin/reply - Admin replies to a user
router.post('/admin/reply', [auth, admin], async (req, res) => {
    try {
        const { userId, text } = req.body;
        if (!userId || !text) return res.status(400).json({ msg: 'User ID and text required' });

        let chat = await SupportChat.findOne({ userId });
        if (!chat) return res.status(404).json({ msg: 'Chat not found' });

        const newMessage = {
            sender: 'admin',
            text: text,
            createdAt: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastMessage = `Admin: ${text}`;
        chat.lastUpdated = new Date();
        await chat.save();

        res.json(chat);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
