const { sendNotificationToToken } = require('./config/firebase');

// 1️⃣ Notification content
const title = "Hey Friend!";
const body = "Check out the new music I just shared with you!";

// 2️⃣ FCM token of the device
const fcmToken = "c7wkKb47S32OG2A4o_Hddw:APA91bF7DBcs7wicSNq_21VnZb0Rgr7xlbUhgnZdWjBbFABAnkJsuWrdWme4_yskSe3A6kN1HCEZnbLfe6Rak0swOZMYLTobKQMsHPCfCilNtUoFU0qO5z0";

// 3️⃣ Send notification
console.log('Attempting to send notification...');
sendNotificationToToken(fcmToken, title, body)
    .then(response => {
        console.log('Success! Message ID:', response);
        process.exit(0);
    })
    .catch(error => {
        console.error('Failed to send notification:', error);
        process.exit(1);
    });
