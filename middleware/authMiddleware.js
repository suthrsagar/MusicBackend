const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    // Get token from header
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // --- SINGLE SESSION CHECK ---
        // Check if this token is still the active session in DB
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({ msg: 'User not found, session invalid' });
        }

        if (user.currentSessionToken !== token) {
            return res.status(401).json({
                msg: 'Session expired. You have been logged in from another device.',
                code: 'SESSION_INVALIDATED'
            });
        }

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid or expired' });
    }
};

module.exports = authMiddleware;
