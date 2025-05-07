const admin = require('firebase-admin');

let initialized = false;

function initFirestore(serviceAccountPath) {
  if (initialized) return;

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  initialized = true;
}


async function exportUsers(serviceAccountPath) {

  initFirestore(serviceAccountPath);

  const fs = require('fs');
  let allUsers = [];
  let nextPageToken;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    allUsers = allUsers.concat(result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  const exportData = allUsers.map(user => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    customClaims: user.customClaims,
    providerData: user.providerData,
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt
  }));

  fs.writeFileSync('./.firebase-users.json', JSON.stringify(exportData, null, 2));
}

module.exports = {
  exportUsers
};
