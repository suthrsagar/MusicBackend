const { sendNotificationToTopic } = require('./config/firebase');

async function sendFinalTest() {
    console.log("🔥 Starting Final Verification Broadcast...");
    try {
        await sendNotificationToTopic(
            'all_users',
            'Verification Success! ✅',
            'The notification system is now fully working from both Admin Panel and script.'
        );
        console.log("✅ Notification delivered to all users.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to deliver:", error);
        process.exit(1);
    }
}

sendFinalTest();
