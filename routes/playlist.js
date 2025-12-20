const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Playlist = require('../models/Playlist');

// @route   POST /api/playlist/create
// @desc    Create a new playlist
// @access  Private
router.post('/create', auth, async (req, res) => {
    try {
        const { name, isPrivate } = req.body;
        const newPlaylist = new Playlist({
            name,
            user: req.user.id,
            isPrivate: isPrivate !== undefined ? isPrivate : true,
            songs: []
        });

        const playlist = await newPlaylist.save();
        res.json(playlist);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/playlist/me
// @desc    Get current user's playlists
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const playlists = await Playlist.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(playlists);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/playlist/add/:id
// @desc    Add song to playlist
// @access  Private
router.put('/add/:id', auth, async (req, res) => {
    try {
        const { songId } = req.body;
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist) return res.status(404).json({ msg: 'Playlist not found' });
        if (playlist.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            await playlist.save();
        }

        res.json(playlist);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/playlist/:id
// @desc    Get playlist by ID with populated songs
// @access  Private (if private) / Public (if public)
router.get('/:id', auth, async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id)
            .populate('songs')
            .populate('user', 'username');

        if (!playlist) return res.status(404).json({ msg: 'Playlist not found' });

        // Basic check for privacy (allow owner or if public)
        if (playlist.isPrivate && playlist.user._id.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'This playlist is private' });
        }

        res.json(playlist);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
