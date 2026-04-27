const mongoose = require('mongoose');
const Song = require('./models/Song');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');
        const songs = await Song.find({});
        console.log(`Found ${songs.length} songs.`);
        songs.forEach(song => {
            console.log(`Title: ${song.title}`);
            console.log(`Cover: ${song.coverImage}`);
            console.log('-------------------');
        });
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
