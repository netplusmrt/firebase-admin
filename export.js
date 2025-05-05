const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const today = getTodayDateFolderName();
let stampPath = '';

// Path to your service account key JSON file
// const serviceAccount = require('../accountancy-app-production-firebase-adminsdk-g22ib-316ed760c0.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

let initialized = false;

function initFirestore(serviceAccountPath) {
  if (initialized) return;

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  initialized = true;
}

function alreadyRanToday(dirName) {
  stampPath = path.join(dirName, '.last_run_date');
  if (fs.existsSync(stampPath)) {
    const lastRun = fs.readFileSync(stampPath, 'utf8');
    if (lastRun === today) return true;
  }
  return false;
}

function getTodayDateFolderName() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // e.g., "2025-05-03"
}

async function exportDataPerUIDAndYear(dirName) {

  const db = admin.firestore();
  
  if (alreadyRanToday(dirName)) {
    console.log('🕒 Already backed up today. Skipping...');
    process.exit(0);
  }
  
  const userDataMap = {};

  const collections = await db.listCollections();
  console.log(`🔍 Found ${collections.length} collections`);

  for (const collectionRef of collections) {
    const collectionName = collectionRef.id;
    const snapshot = await db.collection(collectionName).get();
    
    console.log(`⏳ Scanning collection: ${collectionName}`);

    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = data.uid;
      if (!uid) return;

      const financialYear = data.financialYear;
      const yearKey = financialYear || '_root';

      if (!userDataMap[uid]) userDataMap[uid] = {};
      if (!userDataMap[uid][yearKey]) userDataMap[uid][yearKey] = {};
      if (!userDataMap[uid][yearKey][collectionName]) userDataMap[uid][yearKey][collectionName] = [];

      userDataMap[uid][yearKey][collectionName].push({ id: doc.id, ...data });
    });
  }

  const baseDir = path.join(dirName, 'user_exports', today);
  fs.mkdirSync(baseDir, { recursive: true });

  for (const [uid, yearBuckets] of Object.entries(userDataMap)) {
    const uidDir = path.join(baseDir, uid);
    fs.mkdirSync(uidDir, { recursive: true });

    for (const [yearKey, collections] of Object.entries(yearBuckets)) {
      const targetDir = yearKey === '_root' ? uidDir : path.join(uidDir, yearKey);
      fs.mkdirSync(targetDir, { recursive: true });

      for (const [collectionName, docs] of Object.entries(collections)) {
        const filePath = path.join(targetDir, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
        console.log(`✅ Exported ${filePath}`);
      }
    }
  }

  fs.writeFileSync(stampPath, today);

}

// exportDataPerUIDAndYear().catch(console.error);

module.exports = {
  initFirestore,
  exportDataPerUIDAndYear
};