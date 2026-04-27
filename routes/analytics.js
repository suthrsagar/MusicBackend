const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Song = require('../models/Song');
const DailyStats = require('../models/DailyStats');

// Middleware to check admin role
const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard stats
// @access  Admin
router.get('/dashboard', auth, adminAuth, async (req, res) => {
    try {
        // 1. Basic Counts
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalSongs = await Song.countDocuments();

        // 2. Stream Stats (Aggregate view counts)
        // Since views is an array of ObjectIds in Song schema (as per Migration comment in server.js) like [{userId}]
        // We need to sum the lengths of the views arrays.
        // Actually, schema in Step 849 says: views: [{type: ObjectId, ref: 'User'}]

        const viewsAgg = await Song.aggregate([
            {
                $project: {
                    viewsCount: {
                        $cond: { if: { $isArray: "$views" }, then: { $size: "$views" }, else: 0 }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalStreams: { $sum: "$viewsCount" }
                }
            }
        ]);
        const totalStreams = viewsAgg[0] ? viewsAgg[0].totalStreams : 0;

        // 3. Artist Insights (Top 5 Artists by streams)
        // This is complex as streams are on song. Use aggregate.
        // Unwind songs -> group by artist -> sum views.
        // Wait, Song has 'artist' field as String (Step 849: type: String).
        // It also has 'uploader' (ObjectId).
        // Better to group by 'uploader' if we want real user-artists.
        // But display 'artist' string.

        // Let's assume 'uploader' is consistent.
        // Group by artist name string is easier for display.

        const topSongs = await Song.aggregate([
            {
                $project: {
                    title: 1,
                    artist: 1,
                    viewsCount: {
                        $cond: { if: { $isArray: "$views" }, then: { $size: "$views" }, else: 0 }
                    }
                }
            },
            { $sort: { viewsCount: -1 } },
            { $limit: 5 }
        ]);

        // 4. Revenue (Estimated from Premium Users)
        const premiumUsers = await User.countDocuments({ isPremium: true });

        res.json({
            overview: {
                totalUsers,
                totalSongs,
                totalStreams,
                premiumUsers
            },
            topSongs
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
