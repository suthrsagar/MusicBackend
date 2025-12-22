const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const auth = require('../middleware/authMiddleware');
const Song = require('../models/Song');
const User = require('../models/User'); // Import User model
const { sendNotificationToTopic } = require('../config/firebase'); // Import Notification service
require('dotenv').config();

// Database Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';

const storage = new GridFsStorage({
    url: MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            if (file.fieldname === 'song') {
                const isAudio = file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|m4a|ogg)$/);
                if (!isAudio) {
                    return reject(new Error('Not an audio file! Please upload an MP3/audio file.'));
                }
                const filename = 'song-' + Date.now() + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            } else if (file.fieldname === 'coverImage') {
                const isImage = file.mimetype.startsWith('image/');
                if (!isImage) {
                    return reject(new Error('Not an image file!'));
                }
                const filename = 'cover-' + Date.now() + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'covers'
                };
                resolve(fileInfo);
            } else {
                reject(new Error('Unknown field'));
            }
        });
    }
});

const upload = multer({ storage });

router.post('/upload', auth, upload.fields([{ name: 'song', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req, res) => {
    try {
        if (!req.files || !req.files['song']) {
            return res.status(400).json({ msg: 'Please upload a song file' });
        }

        const { title, artist, album, genre } = req.body;

        const songFile = req.files['song'][0];
        const coverFile = req.files['coverImage'] ? req.files['coverImage'][0] : null;

        // Construct cover image URL if uploaded
        let coverImageUrl = '';
        if (coverFile) {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            coverImageUrl = `${protocol}://${req.get('host')}/api/song/cover/${coverFile.filename}`;
        }

        // Create new song document
        const newSong = new Song({
            title,
            artist,
            album,
            genre, // Optional now
            fileId: songFile.id, // GridFS file ID
            coverImage: coverImageUrl,
            uploader: req.user.id
        });

        // Check if uploader is admin
        const uploader = await User.findById(req.user.id);
        const isAdmin = uploader && uploader.role === 'admin';

        // Admin uploads are automatically approved
        if (isAdmin) {
            newSong.status = 'approved';
        }

        const savedSong = await newSong.save();

        if (isAdmin) {
            try {
                if (sendNotificationToTopic) {
                    await sendNotificationToTopic(
                        'all_users',
                        'New Song Alert! 🎵',
                        `${title} by ${artist} is now available in the app! Listen now!`
                    );
                }
            } catch (e) { console.error('Notification Error', e); }
        } else {
            try {
                if (sendNotificationToTopic) {
                    await sendNotificationToTopic(
                        'admin_notifications',
                        'New Song Request 📝',
                        `User has uploaded "${title}". Please review and approve.`,
                        { songId: savedSong._id.toString() }
                    );
                }
            } catch (e) { console.error('Admin Notification Error', e); }
        }

        res.status(201).json({
            msg: 'Song uploaded successfully',
            metadata: savedSong,
            fileId: songFile.id
        });

    } catch (err) {
        console.error('Server Error:', err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/', async (req, res) => {
    try {
        const songs = await Song.find({ status: 'approved' }).sort({ uploadDate: -1 });
        res.json(songs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/like/:id', auth, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ msg: 'Song not found' });

        if (song.likes.includes(req.user.id)) {
            // Unlike: Remove user id from likes array
            song.likes = song.likes.filter(userId => userId.toString() !== req.user.id);
        } else {
            // Like: Add user id to likes array
            song.likes.push(req.user.id);
        }

        await song.save();
        res.json({ likes: song.likes, msg: 'Success' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/song/view/:id
// @desc    Record a unique view (listener)
// @access  Private
router.post('/view/:id', auth, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ msg: 'Song not found' });

        // Add user to views array if not already present (Unique Listeners)
        if (!song.views.includes(req.user.id)) {
            song.views.push(req.user.id);
            await song.save();
        }

        res.json({ views: song.views.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/song/:id
// @desc    Get song by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ msg: 'Song not found' });
        res.json(song);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Song not found' });
        res.status(500).send('Server Error');
    }
});

router.get('/stream/:fileId', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: 'uploads'
        });

        const files = await bucket.find({ _id: fileId }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ msg: 'File not found' });
        }

        const file = files[0];
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${file.length}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': file.contentType || 'audio/mpeg',
            });

            const downloadStream = bucket.openDownloadStream(fileId, {
                start,
                end: end + 1
            });

            downloadStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': file.length,
                'Content-Type': file.contentType || 'audio/mpeg',
                'Accept-Ranges': 'bytes',
            });

            bucket.openDownloadStream(fileId).pipe(res);
        }

    } catch (err) {
        console.error('Stream error:', err.message);
        if (!res.headersSent) res.status(400).json({ msg: 'Invalid File ID or streaming error' });
    }
});

module.exports = router;

router.get('/cover/:filename', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: 'covers'
        });
        const filename = req.params.filename;
        const files = await bucket.find({ filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ msg: 'No cover found' });
        }

        const file = files[0];
        res.set('Content-Type', file.contentType || 'image/jpeg');
        const downloadStream = bucket.openDownloadStreamByName(filename);
        downloadStream.pipe(res).on('error', () => res.sendStatus(404));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
