const admin = require('firebase-admin');
const fs = require('fs');

let initialized = false;

function initFirestore(serviceAccountPath) {
  if (initialized) return;

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  initialized = true;
}

async function importUsers(serviceAccountPath) {
  initFirestore(serviceAccountPath);

  const users = JSON.parse(fs.readFileSync('./.firebase-users.json', 'utf-8'));

  const result = await admin.auth().importUsers(users, {
    hash: {
      algorithm: 'SCRYPT',
      key: Buffer.from('base64-secret-key', 'base64'), // This must match your original hashing config
      saltSeparator: Buffer.from('base64-salt-separator', 'base64'),
      rounds: 8,
      memoryCost: 14
    }
  });

  console.log('Success:', result.successCount);
  console.log('Failure:', result.failureCount);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
}

module.exports = {
  importUsers
};
  
