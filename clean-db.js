const mongoose = require('mongoose');
require('dotenv').config();

const cleanUsersOnly = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB...');

        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        await mongoose.connection.db.collection('users').deleteMany({});

        console.log(`🗑️ Deleted ${userCount} documents from users collection.`);
        console.log('🎵 Songs collection was NOT touched.');

        console.log('\n✨ Database Cleanup Done (Users Only).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error cleaning users:', err);
        process.exit(1);
    }
};

cleanUsersOnly();
