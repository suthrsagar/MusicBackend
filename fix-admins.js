const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = "mongodb+srv://boysdeveloper490_db_user:Sagar1234@sagar1.n3lrepu.mongodb.net/musicApp?retryWrites=true&w=majority";

const fixAdmins = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ DB Connected');

        const User = mongoose.connection.db.collection('users');
        const targetEmail = 'sutharsagar710@gmail.com';

        // 1. Demote everyone
        await User.updateMany({}, { $set: { role: 'user' } });
        console.log('🔄 All users set to user role');

        // 2. Promote target
        const result = await User.updateOne({ email: targetEmail }, { $set: { role: 'admin' } });

        if (result.matchedCount > 0) {
            console.log('🚀 ' + targetEmail + ' is now the ONLY ADMIN!');
        } else {
            console.log('❌ User ' + targetEmail + ' NOt found in DB. Please sign up first.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fixAdmins();
