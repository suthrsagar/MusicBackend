const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: '*' // Allow all origins (for mobile app). For production, replace * with your frontend URL
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploads folder

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
// Make sure routes point correctly
app.use('/api', require('./routes/auth'));
app.use('/api/song', require('./routes/song'));

// Root route
app.get('/', (req, res) => {
  res.send('API is running at https://music-backend-wheat.vercel.app');
});

// Start Server (for local testing / Render / Railway)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
