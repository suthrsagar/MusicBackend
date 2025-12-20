const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Body parser built-in to Express
app.use('/uploads', express.static('uploads')); // Make uploads folder public


// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected...');

        // MIGRATION: Fix 'views' field type from Number to Array if needed
        try {
            const result = await mongoose.connection.db.collection('songs').updateMany(
                { views: { $type: "number" } },
                { $set: { views: [] } }
            );
            if (result.modifiedCount > 0) {
                console.log(`Migrated ${result.modifiedCount} songs to new views schema.`);
            }
        } catch (e) { console.log('Migration check failed', e); }

    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api/song', require('./routes/song'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/playlist', require('./routes/playlist'));
app.use('/api/monetization', require('./routes/monetization'));
app.use('/api/analytics', require('./routes/analytics'));


// Simple root route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
