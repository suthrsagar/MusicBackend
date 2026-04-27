const { sendNotificationToTopic } = require('./config/firebase');

const title = "Hello!";
const body = "This is a test notification from the system. Have a great day!";

console.log('🚀 Sending "Hello" notification to all users...');

sendNotificationToTopic('all_users', title, body)
    .then(response => {
        console.log('✅ Success! Notification sent to topic: all_users');
        console.log('Result:', response);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Failed to send notification:', error);
        process.exit(1);
    });
