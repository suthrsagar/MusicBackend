const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs'); // Needed for password comparison/hashing

// @route   POST /api/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Simple Validation
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }
    if (password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    try {
        // Check for existing user
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new user
        // Note: Password hashing is handled in the User model pre-save hook
        user = new User({
            username,
            email,
            passwordHash: password
        });

        await user.save();

        // Create JWT Payload
        const payload = {
            user: {
                id: user.id
            }
        };

        // Sign Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }, // Increased to 7 days for better UX
            async (err, token) => {
                if (err) throw err;

                // Save this as the active session token
                await User.findByIdAndUpdate(user.id, { currentSessionToken: token });

                res.status(201).json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // Check for user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        if (user.isBanned) {
            return res.status(403).json({ msg: 'Your account has been banned. Contact admin.' });
        }

        // Validate Password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT Payload
        const payload = {
            user: {
                id: user.id
            }
        };

        // Sign Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }, // Increased to 7 days
            async (err, token) => {
                if (err) throw err;

                // Save this as the active session token
                await User.findByIdAndUpdate(user.id, { currentSessionToken: token });

                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        isBanned: user.isBanned
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/profile
// @desc    Get user data
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (user.avatar && !user.avatar.startsWith('http')) {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            user.avatar = `${protocol}://${req.get('host')}/api/avatar/${user.avatar}`;
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/profile/update
// @desc    Update user profile (username, password)
// @access  Private
router.put('/profile/update', auth, async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Update Username
        if (username) user.username = username;

        // Update Password
        if (newPassword) {
            if (!oldPassword) {
                return res.status(400).json({ msg: 'Please provide old password to set a new one.' });
            }
            const isMatch = await user.comparePassword(oldPassword);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid old password' });
            }
            user.passwordHash = newPassword; // Pre-save hook will hash this
        }

        await user.save();
        res.json({ msg: 'Profile updated successfully', user: { username: user.username, email: user.email } });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/profile/photo
// @desc    Upload profile photo
// @access  Private
const upload = require('../middleware/upload');

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
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// @route   GET /api/user/email/:email
// @desc    Get user by email
// @access  Public
router.get('/user/email/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
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

        res.set('Content-Type', files[0].contentType || 'image/jpeg');
        const downloadStream = bucket.openDownloadStreamByName(filename);
        downloadStream.pipe(res).on('error', () => res.sendStatus(404));
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
