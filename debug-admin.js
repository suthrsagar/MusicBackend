const mongoose = require('mongoose');
require('dotenv').config();

const doWork = async () => {
    try {
        const uri = process.env.MONGO_URI;
        await mongoose.connect(uri);
        console.log('DB Connection OK');

        const User = mongoose.connection.db.collection('users');
        // Checking for the specific email with "gail.com"
        const email = 'sutharsagar710@gail.com';

        const user = await User.findOne({ email });
        if (user) {
            await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
            console.log('✅ Admin set for ' + email);
        } else {
            console.log('❌ User ' + email + ' not found.');
            const all = await User.find({}).toArray();
            console.log('Available users: ' + all.map(u => u.email).join(', '));
        }

        // Also check if any file exists in avatars bucket for debugging
        const avatars = await mongoose.connection.db.collection('avatars.files').find().toArray();
        console.log('Avatars in DB: ' + avatars.length);

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
};

doWork();
