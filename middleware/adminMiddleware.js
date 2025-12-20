const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        // user is already attached to req by authMiddleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = adminMiddleware;
