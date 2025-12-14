const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/authMiddleware');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/songs/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // song-TIMESTAMP.EXT
        // Using file.originalname to preserve extension correctly or fallback
        const ext = path.extname(file.originalname);
        cb(null, 'song-' + Date.now() + ext);
    }
});

// Filter for audio files
const fileFilter = (req, file, cb) => {
    // Basic check for audio mime type or extension
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|m4a|ogg)$/)) {
        cb(null, true);
    } else {
        cb(new Error('Not an audio file! Please upload an audio file.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit example
});

// @route   POST /api/song/upload
// @desc    Upload a song
// @access  Private
router.post('/upload', auth, upload.single('song'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Please upload a file' });
        }

        // Construct file info
        const songData = {
            fileName: req.file.filename,
            filePath: req.file.path.replace(/\\/g, "/"), // Fix windows paths for JSON response
            originalName: req.file.originalname,
            size: req.file.size,
            uploadDate: new Date(),
            uploader: req.user.id
        };

        // If we had a DB model, we would save 'songData' here.

        res.status(201).json({
            msg: 'Song uploaded successfully',
            song: songData
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
