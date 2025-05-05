const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your service account key JSON file
const serviceAccount = require('../accountancy-app-dev-firebase-adminsdk-da82p-e37a0a5c28.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const COLLECTIONS_TO_EXPORT = ['authentications']; // List all relevant collections here

async function exportDataGroupedByUID() {
  const userDataMap = {};

  for (const collectionName of COLLECTIONS_TO_EXPORT) {
    const collectionSnapshot = await db.collection(collectionName).get();
    console.log(`Processing collection: ${collectionName}`);

    collectionSnapshot.forEach(doc => {
      const data = doc.data();
      const uid = data.uid || doc.id; // fallback to doc ID if uid is missing (e.g. profiles)

      if (!uid) return;

      if (!userDataMap[uid]) {
        userDataMap[uid] = {};
      }

      if (!userDataMap[uid][collectionName]) {
        userDataMap[uid][collectionName] = [];
      }

      userDataMap[uid][collectionName].push({ id: doc.id, ...data });
    });
  }

  const baseDir = path.join(__dirname, 'user_exports');
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

  for (const [uid, collections] of Object.entries(userDataMap)) {
    const userDir = path.join(baseDir, uid);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir);

    for (const [collectionName, docs] of Object.entries(collections)) {
      const filePath = path.join(userDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      console.log(`✅ Exported ${collectionName}.json for UID: ${uid}`);
    }
  }
}

exportDataGroupedByUID().catch(console.error);
