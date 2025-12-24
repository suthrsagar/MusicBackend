const mongoose = require('mongoose');
const Song = require('./models/Song');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const OLD_BASE = 'http://10.206.215.196:5000';
const NEW_BASE = 'https://musicbackend-7i18.onrender.com';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');
        const songs = await Song.find({ coverImage: { $regex: OLD_BASE } });
        console.log(`Found ${songs.length} songs to update.`);

        for (const song of songs) {
            const oldUrl = song.coverImage;
            const newUrl = oldUrl.replace(OLD_BASE, NEW_BASE);
            console.log(`Updating: ${song.title}`);
            console.log(`  Old: ${oldUrl}`);
            console.log(`  New: ${newUrl}`);

            song.coverImage = newUrl;
            await song.save();
        }

        console.log('All updates complete.');
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
