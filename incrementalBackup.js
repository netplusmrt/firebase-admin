const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// CONFIG
const OUTPUT_DIR = './incremental_backup';
const STATE_FILE = './.last_backup.json';

let initialized = false;

function initFirestore(serviceAccountPath) {
    console.log('initFirestore');
  if (initialized) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
}

function loadBackupState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {};
}

function saveBackupState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getBackupFile(uid, financialYear, collectionName, docs) {
  const filePath = path.join(OUTPUT_DIR, uid, financialYear, `${collectionName}.json`);
  return filePath;
}

function writeBackupFile(uid, financialYear, collectionName, docs) {
  const backupDate = new Date().toISOString().split('T')[0];
  const dir = path.join(OUTPUT_DIR, uid, financialYear);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
  console.log(`✅ Backed up ${docs.length} docs for UID=${uid}, collection=${collectionName} to ${filePath}`);
}

async function runIncrementalBackup(serviceAccountPath) {
  initFirestore(serviceAccountPath);
  const db = admin.firestore();

  const collections = await db.listCollections();
  const backupState = loadBackupState();
  const now = new Date();

  for (const col of collections) {
    const collectionName = col.id;
    const colState = backupState[collectionName] || {};
    const lastBackupTime = colState.lastBackupTime ? colState.lastBackupTime : null;

    let query = db.collection(collectionName);
    if (lastBackupTime) {
      query = query.where('updatedDate', '>', lastBackupTime);
    }

    const snapshot = await query.get({ pageSize: 500, autoPaginate: true });

    if (snapshot.empty) {
      console.log(`ℹ️ No new documents in collection "${collectionName}" since last backup.`);
      continue;
    }

    // // Load existing backup file (if any)
    // let existingRecords = [];
    // let recordIds = new Set();

    // const sampleDoc = snapshot.docs[0].data();
    // const year = sampleDoc.financialYear || '_root';
    // const filePath = path.join(OUTPUT_DIR, uid, year, `${collectionName}.json`);
    // fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // if (fs.existsSync(filePath)) {
    //   existingRecords = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    //   recordIds = new Set(existingRecords.map(d => d.id));
    // }

    // Organize by uid -> financialYear -> docs[]
    const grouped = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = data.uid;
      const year = data.financialYear || '_root';

      if (!uid) return; // Skip if no UID

      grouped[uid] ??= {};
      grouped[uid][year] ??= {};
      grouped[uid][year][collectionName] ??= [];

      grouped[uid][year][collectionName].push({ id: doc.id, ...data });
    });

    // Write each UID's data
    for (const [uid, years] of Object.entries(grouped)) {
      for (const [year, collections] of Object.entries(years)) {
        const docs = collections[collectionName];
        writeBackupFile(uid, year, collectionName, docs);
      }
    }

    // Update state
    backupState[collectionName] = {
      lastBackupTime: now.toISOString()
    };
  }

  saveBackupState(backupState);
  console.log('✅ Incremental backup completed.');
}

module.exports = { runIncrementalBackup };
