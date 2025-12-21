const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

let firebaseInitialized = false;

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        firebaseInitialized = true;
        console.log('✅ Firebase Initialized using local serviceAccountKey.json');
    } catch (error) {
        console.error('❌ Firebase initialization error (local file):', error.message);
    }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        firebaseInitialized = true;
        console.log('✅ Firebase Initialized using Environment Variable');
    } catch (error) {
        console.error('❌ Firebase initialization error (Env Var): Check if JSON is valid. Error:', error.message);
    }
} else {
    console.warn('⚠️ Firebase NOT initialized: Neither serviceAccountKey.json nor FIREBASE_SERVICE_ACCOUNT env var found.');
}

const sendNotificationToTopic = async (topic, title, body, data = {}) => {
    if (!firebaseInitialized) return;

    const message = {
        notification: {
            title,
            body,
            image: data.imageUrl || ''
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'default',
                icon: 'ic_launcher',
                color: '#4318FF',
                sound: 'default',
                priority: 'high',
                clickAction: 'fcm.ACTION.DEFAULT',
                visibility: 'public',
            }
        },
        data: data,
        topic: topic
    };

    try {
        const response = await admin.messaging().send(message);
        return response;
    } catch (error) {
        throw error;
    }
};

const sendNotificationToToken = async (fcmToken, title, body, data = {}) => {
    if (!firebaseInitialized) return;

    const message = {
        token: fcmToken,
        notification: {
            title,
            body,
            image: data.imageUrl || ''
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'default',
                icon: 'ic_launcher',
                color: '#4318FF',
                sound: 'default',
                priority: 'high',
                clickAction: 'fcm.ACTION.DEFAULT',
                visibility: 'public',
            }
        },
        data: data
    };

    try {
        const response = await admin.messaging().send(message);
        return response;
    } catch (error) {
        throw error;
    }
};

module.exports = { admin, sendNotificationToTopic, sendNotificationToToken };
