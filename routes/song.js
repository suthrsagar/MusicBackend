const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const auth = require('../middleware/authMiddleware');
const Song = require('../models/Song');
require('dotenv').config();

// Database Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';

// Create GridFS storage engine
const storage = new GridFsStorage({
    url: MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            // Check for audio MIME types or extensions
            const isAudio = file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|m4a|ogg)$/);

            if (!isAudio) {
                return reject(new Error('Not an audio file! Please upload an MP3/audio file.'));
            }

            const filename = 'song-' + Date.now() + path.extname(file.originalname);
            const fileInfo = {
                filename: filename,
                bucketName: 'uploads' // The GridFS bucket name (uploads.files, uploads.chunks)
            };
            resolve(fileInfo);
        });
    }
});

const upload = multer({ storage });

// @route   POST /api/song/upload
// @desc    Upload an MP3 song with metadata
// @access  Private
router.post('/upload', auth, upload.single('song'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Please upload a file' });
        }

        const { title, artist, album, genre } = req.body;

        // Create new song document
        const newSong = new Song({
            title,
            artist,
            album,
            genre,
            fileId: req.file.id, // GridFS file ID
            uploader: req.user.id
        });

        // Save metadata to MongoDB
        const savedSong = await newSong.save();

        // Respond with success
        res.status(201).json({
            msg: 'Song uploaded successfully',
            metadata: savedSong,
            fileId: req.file.id
        });

    } catch (err) {
        console.error('Server Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/song
// @desc    Get all APPROVED songs
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Only return approved songs to public
        const songs = await Song.find({ status: 'approved' }).sort({ uploadDate: -1 });
        res.json(songs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/song/like/:id
// @desc    Like or Unlike a song
// @access  Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ msg: 'Song not found' });

        // Check if already liked
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

// @route   GET /api/song/stream/:fileId
// @desc    Stream song by GridFS fileId
// @access  Public
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
                end: end + 1 // GridFS end is exclusive
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
