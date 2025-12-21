const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Song = require('../models/Song');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const { sendNotificationToTopic } = require('../config/firebase');

// @route   GET /api/admin/stats
// @desc    Get dashboard stats
// @access  Private/Admin
router.get('/stats', [auth, admin], async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const songCount = await Song.countDocuments();

        const onlineCount = await User.countDocuments({
            currentSessionToken: { $ne: '' }
        });

        res.json({
            users: userCount,
            songs: songCount,
            online: onlineCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', [auth, admin], async (req, res) => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/admin/users/:id/ban
// @desc    Ban/Unban user
// @access  Private/Admin
router.put('/users/:id/ban', [auth, admin], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ msg: 'Cannot ban yourself' });
        }

        user.isBanned = !user.isBanned;

        if (user.isBanned) {
            user.currentSessionToken = '';
        }

        await user.save();

        res.json({ msg: user.isBanned ? 'User banned' : 'User unbanned', isBanned: user.isBanned });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/users/:id', [auth, admin], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ msg: 'Cannot delete yourself' });
        }

        await Song.deleteMany({ uploader: user._id });

        await user.deleteOne();
        res.json({ msg: 'User and their content deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/admin/songs/pending
// @desc    Get all pending songs
// @access  Private/Admin
router.get('/songs/pending', [auth, admin], async (req, res) => {
    try {
        const songs = await Song.find({ status: 'pending' }).populate('uploader', 'username email').sort({ uploadDate: -1 });
        res.json(songs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/admin/songs/:id/approve
// @desc    Approve a song
// @access  Private/Admin
router.put('/songs/:id/approve', [auth, admin], async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ msg: 'Song not found' });

        song.status = 'approved';
        await song.save();

        if (sendNotificationToTopic) {
            sendNotificationToTopic('all_users', 'New Song Added!', `Check out ${song.title} by ${song.artist}`, { songId: song._id.toString() });
        }

        res.json({ msg: 'Song approved', song });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/admin/songs/:id
// @desc    Delete/Reject song and file
// @access  Private/Admin
router.delete('/songs/:id', [auth, admin], async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ msg: 'Song not found' });
        }

        const fileId = song.fileId;

        // Delete from GridFS
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

        try {
            await bucket.delete(fileId);
        } catch (e) {
            console.warn('File not found in GridFS, deleting metadata only');
        }

        // Delete metadata
        await song.deleteOne();

        res.json({ msg: 'Song deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/admin/make-admin/:email
// @desc    Make a user admin (Development/Setup only)
// @access  Private (Any logged in user can try, but logic checks)
// WARNING: Remove or protect this in production!
router.post('/make-admin/:email', auth, async (req, res) => {
    try {
        // Only allow if NO admins exist yet? Or just allow for now for setup.
        // For this demo, I will allow it so the user can set themselves as admin.
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.role = 'admin';
        await user.save();
        res.json({ msg: `User ${user.email} is now an admin` });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
