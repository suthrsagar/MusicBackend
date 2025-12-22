const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Song = require('../models/Song');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const { sendNotificationToTopic } = require('../config/firebase');

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

router.get('/users', [auth, admin], async (req, res) => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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

router.get('/songs/pending', [auth, admin], async (req, res) => {
    try {
        const songs = await Song.find({ status: 'pending' }).populate('uploader', 'username email').sort({ uploadDate: -1 });
        res.json(songs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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

router.put('/songs/:id', [auth, admin], async (req, res) => {
    try {
        const { title, artist, album, genre } = req.body;
        const song = await Song.findById(req.params.id);

        if (!song) {
            return res.status(404).json({ msg: 'Song not found' });
        }

        if (title) song.title = title;
        if (artist) song.artist = artist;
        if (album) song.album = album;
        if (genre) song.genre = genre;

        await song.save();
        res.json({ msg: 'Song updated successfully', song });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/songs/:id', [auth, admin], async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ msg: 'Song not found' });
        }

        const fileId = song.fileId;


        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

        try {
            await bucket.delete(fileId);
        } catch (e) {
            console.warn('File not found in GridFS, deleting metadata only');
        }



        await song.deleteOne();

        res.json({ msg: 'Song deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/users/:id/make-admin', [auth, admin], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (user.role === 'admin') {
            return res.status(400).json({ msg: 'User is already an admin' });
        }

        user.role = 'admin';
        await user.save();
        res.json({ msg: `User ${user.username} is now an Admin`, user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.put('/users/:id/remove-admin', [auth, admin], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ msg: 'Cannot remove yourself' });
        }

        user.role = 'user';
        await user.save();
        res.json({ msg: `Admin rights removed for ${user.username}`, user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
