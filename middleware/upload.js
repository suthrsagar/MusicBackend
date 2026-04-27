const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';

const storage = new GridFsStorage({
    url: MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const filename = 'avatar-' + Date.now() + path.extname(file.originalname);
            const fileInfo = {
                filename: filename,
                bucketName: 'avatars'
            };
            resolve(fileInfo);
        });
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 },
});

module.exports = upload;
