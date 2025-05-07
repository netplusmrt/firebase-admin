const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const today = getTodayDateFolderName();
const stampPath = './.last_run_date';
const stateFile = './.last_collection_exported.json';

let initialized = false;

function initFirestore(serviceAccountPath) {
  if (initialized) return;

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  initialized = true;
}

function alreadyRanToday() {
  if (fs.existsSync(stampPath)) {
    const lastRun = fs.readFileSync(stampPath, 'utf8');
    if (lastRun === today) return true;
  }
  return false;
}

function getNextCollectionToExport(COLLECTIONS_TO_EXPORT) {
  let lastExported = null;

  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    lastExported = state.last || null;
  }

  let nextIndex = 0;
  if (lastExported) {
    const lastIndex = COLLECTIONS_TO_EXPORT.indexOf(lastExported);
    nextIndex = (lastIndex + 1) % COLLECTIONS_TO_EXPORT.length;
  }

  const next = COLLECTIONS_TO_EXPORT[nextIndex];
  fs.writeFileSync(stateFile, JSON.stringify({ last: next }, null, 2));
  return next;
}

function getTodayDateFolderName() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // e.g., "2025-05-03"
}

async function exportDataPerUIDAndYear(serviceAccountPath) {

  initFirestore(serviceAccountPath);

  const db = admin.firestore();

  if (alreadyRanToday()) {
    console.log('🕒 Already backed up today. Skipping...');
    process.exit(0);
  }

  const collections = await db.listCollections();
  console.log(`🔍 Found ${collections.length} collections`);

  const COLLECTIONS_TO_EXPORT = collections.map(col => col.id); // Convert to names

  const collectionName = getNextCollectionToExport(COLLECTIONS_TO_EXPORT);

  console.log(`⏳ Scanning collection: ${collectionName}`);

  const snapshot = await db.collection(collectionName).get();
    
  exportCollection(collectionName, snapshot);

}

async function exportSingleCollection(serviceAccountPath, collectionName) {

  initFirestore(serviceAccountPath);

  const db = admin.firestore();

  console.log(`⏳ Scanning collection: ${collectionName}`);

  const snapshot = await db.collection(collectionName).get();
    
  exportCollection(collectionName, snapshot);

}

function exportCollection(collectionName, snapshot) {
  const userDataMap = {};

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

  const baseDir = path.join("./", 'user_exports');
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
  exportDataPerUIDAndYear,
  exportSingleCollection
};