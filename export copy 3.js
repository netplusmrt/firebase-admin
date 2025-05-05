const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your service account key JSON file
const serviceAccount = require('../easy-business-account-firebase-adminsdk-rxqze-390c6bdb5b.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const PAGE_SIZE = 500;

const stampPath = path.join(__dirname, '.last_run_date');

function alreadyRanToday() {
  const today = getTodayDateFolderName();
  if (fs.existsSync(stampPath)) {
    const lastRun = fs.readFileSync(stampPath, 'utf8');
    if (lastRun === today) return true;
  }
  fs.writeFileSync(stampPath, today);
  return false;
}

function getTodayDateFolderName() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // e.g., "2025-05-03"
}

async function exportDataPerUIDAndYear() {

  if (alreadyRanToday()) {
    console.log('🕒 Already backed up today. Skipping...');
    // process.exit(0);
  }
  
  const userDataMap = {};

  const collections = await db.listCollections();
  console.log(`🔍 Found ${collections.length} collections`);

  for (const collectionRef of collections) {
    const collectionName = collectionRef.id;
    console.log(`⏳ Paginating collection: ${collectionName}`);

    let lastDoc = null;
    let hasMore = true;

    while (hasMore) {
      let query = collectionRef.orderBy('__name__').limit(PAGE_SIZE);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      if (snapshot.empty) break;

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

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.size === PAGE_SIZE;
    }
  }

  const today = getTodayDateFolderName();
  const baseDir = path.join(__dirname, 'user_exports', today);
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
}

exportDataPerUIDAndYear().catch(console.error);
