const mongoose = require('mongoose');
require('dotenv').config();

const makeAdmin = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB...');

        const email = 'suttharsagar710@gmail.com';
        const User = mongoose.connection.db.collection('users');

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User with email ${email} NOT found.`);
            process.exit(1);
        }

        await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
        console.log(`🚀 User ${email} is now an ADMIN!`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating user:', err);
        process.exit(1);
    }
};

makeAdmin();
