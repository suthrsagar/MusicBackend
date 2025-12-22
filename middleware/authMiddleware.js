const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Verify single session
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ msg: 'User not found' });
        }

        if (token !== user.currentSessionToken) {
            return res.status(401).json({ msg: 'Session expired. Logged in on another device.' });
        }

        req.user = user; // Attach full user to req if needed, or just keep fields
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = authMiddleware;
