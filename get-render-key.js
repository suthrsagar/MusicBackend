const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
    console.log('❌ Error: serviceAccountKey.json not found in this folder!');
    process.exit(1);
}

try {
    const keyFile = fs.readFileSync(keyPath, 'utf8');
    const minified = JSON.stringify(JSON.parse(keyFile));

    console.log('\n--- COPY THE LINE BELOW ---');
    console.log(minified);
    console.log('--- END OF LINE ---\n');

    console.log('Steps:');
    console.log('1. Copy the long line above (starts with {"type":"service_account"...)');
    console.log('2. Go to Render Dashboard -> Environment Settings.');
    console.log('3. Key: FIREBASE_SERVICE_ACCOUNT');
    console.log('4. Value: Paste that copied line.');
    console.log('5. Save and wait for Deploy.');
} catch (err) {
    console.log('❌ Invalid JSON in serviceAccountKey.json');
}
