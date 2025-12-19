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
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api/song', require('./routes/song'));


// Simple root route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
