const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';

// Create GridFS storage engine for images
const storage = new GridFsStorage({
    url: MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const filetypes = /jpeg|jpg|png|webp/;
            const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = filetypes.test(file.mimetype);

            if (!mimetype || !extname) {
                return reject(new Error('Error: Images Only (jpeg, jpg, png, webp)!'));
            }

            const filename = 'avatar-' + Date.now() + path.extname(file.originalname);
            const fileInfo = {
                filename: filename,
                bucketName: 'avatars' // Specific bucket for profile photos
            };
            resolve(fileInfo);
        });
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
});

module.exports = upload;
