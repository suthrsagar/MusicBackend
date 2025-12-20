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
        console.log("Firebase Admin Initialized (via File)");
    } catch (error) {
        console.error("Firebase Admin Init Failed:", error);
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
        console.log("Firebase Admin Initialized (via Env Var)");
    } catch (error) {
        console.error("Firebase Admin Init Failed from Env Var:", error);
    }
} else {
    console.warn("WARNING: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var missing. Notifications will not work.");
}

const sendNotificationToTopic = async (topic, title, body, data = {}) => {
    if (!firebaseInitialized) return;

    const message = {
        notification: {
            title,
            body
        },
        android: {
            priority: 'high', // Critical: Keeps it 'working' even when app is closed
            notification: {
                channelId: 'default',
                sound: 'default',
                priority: 'default', // Visual: 'default' displays in tray, but doesn't 'pop' on screen
                clickAction: 'fcm.ACTION.DEFAULT',
            }
        },
        data: data,
        topic: topic
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

const sendNotificationToToken = async (fcmToken, title, body, data = {}) => {
    if (!firebaseInitialized) {
        console.error("Firebase not initialized. Cannot send notification.");
        return;
    }

    const message = {
        token: fcmToken,
        notification: {
            title,
            body
        },
        android: {
            priority: 'high', // Critical: Keeps it 'working' even when app is closed
            notification: {
                channelId: 'default',
                sound: 'default',
                priority: 'default', // Visual: 'default' displays in tray, but doesn't 'pop' on screen
                clickAction: 'fcm.ACTION.DEFAULT',
            }
        },
        data: data
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message to token:', response);
        return response;
    } catch (error) {
        console.error('Error sending message to token:', error);
        throw error;
    }
};

module.exports = { admin, sendNotificationToTopic, sendNotificationToToken };
