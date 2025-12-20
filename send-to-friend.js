const { sendNotificationToToken } = require('./config/firebase');

/**
 * 💡 ADMIN NOTIFICATION SCRIPT
 * This script allows you to manually send a notification to a specific device.
 */

// 1️⃣ Notification Content
const title = "Hey Friend!";
const body = "Check out the new music I just shared with you!";

// 2️⃣ FCM token of the device (Get this from your mobile app console/logs)
// Replace this with the fresh token from your device
const fcmToken = "c7wkKb47S32OG2A4o_Hddw:APA91bF7DBcs7wicSNq_21VnZb0Rgr7xlbUhgnZdWjBbFABAnkJsuWrdWme4_yskSe3A6kN1HCEZnbLfe6Rak0swOZMYLTobKQMsHPCfCilNtUoFU0qO5z0";

// 3️⃣ Logic to send
async function sendManualNotification() {
    console.log('🚀 Attempting to send notification to device...');

    try {
        const response = await sendNotificationToToken(fcmToken, title, body);
        console.log('✅ Successfully sent message:', response);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error sending message:', error.message);

        if (error.code === 'messaging/registration-token-not-registered') {
            console.log('\n⚠️  ERROR: The FCM Token is invalid or expired.');
            console.log('👉 Open your mobile app and look for "🔥 FCM TOKEN" in the console to get a fresh one.');
        }
        process.exit(1);
    }
}

sendManualNotification();
