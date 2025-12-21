const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const upload = require('../middleware/upload');

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }
    if (password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User({
            username,
            email,
            passwordHash: password
        });
        await user.save();
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
            if (err) throw err;
            user.currentSessionToken = token;
            await user.save();
            res.json({ token });
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
            if (err) throw err;
            user.currentSessionToken = token;
            await user.save();
            res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (user.avatar && !user.avatar.startsWith('http')) {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            user.avatar = `${protocol}://${req.get('host')}/api/avatar/${user.avatar}`;
        }
        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/profile/photo', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }
        const avatarName = req.file.filename;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { avatar: avatarName },
            { new: true }
        ).select('-passwordHash');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const fullAvatarUrl = `${protocol}://${req.get('host')}/api/avatar/${avatarName}`;
        res.json({
            msg: 'Photo uploaded successfully',
            avatar: fullAvatarUrl,
            user: {
                ...user.toObject(),
                avatar: fullAvatarUrl
            }
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/avatar/:filename', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: 'avatars'
        });
        const filename = req.params.filename;
        const files = await bucket.find({ filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ msg: 'No file found' });
        }
        res.set('Content-Type', 'image/jpeg');
        const downloadStream = bucket.openDownloadStreamByName(filename);
        downloadStream.pipe(res).on('error', () => res.sendStatus(404));
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
