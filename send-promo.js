const { sendNotificationToTopic } = require('./config/firebase');

// User Request: "new dhurender moive ka new song app me aaya hai"
const title = "New Song Added! 🎵";
const body = "New Dhurender Moive ka New Song app me aaya hai! Check it out now. 🚀";
const topic = "all_users";

async function broadcast() {
    console.log(`🚀 Sending broadcast to '${topic}'...`);
    try {
        await sendNotificationToTopic(topic, title, body);
        console.log('✅ Notification sent successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        process.exit(1);
    }
}

broadcast();
