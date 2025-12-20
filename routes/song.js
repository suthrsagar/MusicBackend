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

// @route   GET /api/song/stream/:fileId
// @desc    Stream song by GridFS fileId
// @access  Public
router.get('/stream/:fileId', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);

        // Connect to GridFS Bucket
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: 'uploads'
        });

        // Check if file exists (optional but good for error handling)
        const files = await bucket.find({ _id: fileId }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ msg: 'File not found' });
        }

        // Stream file
        const downloadStream = bucket.openDownloadStream(fileId);

        // Set basic headers (ideally extract mime type from db if saved)
        res.set('Content-Type', 'audio/mpeg');
        res.set('Accept-Ranges', 'bytes');

        downloadStream.on('error', (err) => {
            res.status(404).json({ msg: 'Error streaming file' });
        });

        downloadStream.pipe(res);

    } catch (err) {
        console.error(err.message);
        res.status(400).json({ msg: 'Invalid File ID' });
    }
});

module.exports = router;
