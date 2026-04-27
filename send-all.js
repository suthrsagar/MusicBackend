const { sendNotificationToTopic } = require('./config/firebase');

/**
 * 💡 ADMIN BROADCAST SCRIPT
 * This script allows an admin to send a notification to ALL users
 * subscribed to the 'all_users' topic.
 */

// 1️⃣ Notification Content
const title = "New Music Alert! 🎶";
const body = "Admin has just added a new trending track. Check it out now!";

// 2️⃣ Topic Name (The app must be subscribed to this)
const topic = "all_users";

// 3️⃣ Logic to send
async function broadcastNotification() {
    console.log(`🚀 Attempting to broadcast notification to topic: ${topic}...`);

    try {
        await sendNotificationToTopic(topic, title, body);
        console.log('✅ Successfully broadcasted message to all users!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error broadcasting message:', error.message);
        process.exit(1);
    }
}

broadcastNotification();
