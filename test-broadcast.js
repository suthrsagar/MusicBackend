const { sendNotificationToTopic } = require('./config/firebase');

const title = "� Final Test Notification";
const body = "Ye notification app close hone par bhi aani chahiye! Priority High kar di gayi hai. 🎯";

console.log('Attempting to send test notification to all_users topic...');

sendNotificationToTopic('all_users', title, body)
    .then(response => {
        console.log('✅ Notification Sent Successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Notification Failed:', error);
        process.exit(1);
    });
