const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your service account key JSON file
const serviceAccount = require('../accountancy-app-dev-firebase-adminsdk-da82p-e37a0a5c28.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportDataPerUIDAndYear() {
  const collections = await db.listCollections();
  console.log(`🔍 Found ${collections.length} collections`);

  const userDataMap = {}; // { uid: { financialYear: { collection: [docs] }, _root: { collection: [docs] } } }

  for (const collectionRef of collections) {
    const collectionName = collectionRef.id;
    const snapshot = await db.collection(collectionName).get();
    
    console.log(`⏳ Scanning collection: ${collectionName}`);

    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = data.uid || doc.id;
      if (!uid) return;

      const financialYear = data.financialYear;
      const yearKey = financialYear || '_root';

      if (!userDataMap[uid]) userDataMap[uid] = {};
      if (!userDataMap[uid][yearKey]) userDataMap[uid][yearKey] = {};
      if (!userDataMap[uid][yearKey][collectionName]) userDataMap[uid][yearKey][collectionName] = [];

      userDataMap[uid][yearKey][collectionName].push({ id: doc.id, ...data });
    });
  }

  const baseDir = path.join(__dirname, 'user_exports');
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

  for (const [uid, yearBuckets] of Object.entries(userDataMap)) {
    const uidDir = path.join(baseDir, uid);
    if (!fs.existsSync(uidDir)) fs.mkdirSync(uidDir);

    for (const [yearKey, collections] of Object.entries(yearBuckets)) {
      const targetDir = yearKey === '_root' ? uidDir : path.join(uidDir, yearKey);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

      for (const [collectionName, docs] of Object.entries(collections)) {
        const filePath = path.join(targetDir, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
        console.log(`✅ Exported ${filePath}`);
      }
    }
  }
}

exportDataPerUIDAndYear().catch(console.error);
