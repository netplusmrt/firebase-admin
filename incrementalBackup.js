const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// CONFIG
const OUTPUT_DIR = './user_exports';
const STATE_FILE = './.last_backup.json';
const readline = require('readline');

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

function writeBackupFile(uid, financialYear, collectionName, docs) {
  const dir = path.join(OUTPUT_DIR, uid, financialYear);
  const filePath = path.join(dir, `${collectionName}.json`);

  fs.mkdirSync(dir, { recursive: true });

  let existingData = [];
  if (fs.existsSync(filePath)) {
    existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Replace by ID if exists
  for (const doc of docs) {
    const index = existingData.findIndex(item => item.id === doc.id);
    if (index >= 0) {
      existingData[index] = doc;
    } else {
      existingData.push(doc);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  console.log(`✅ Backed up ${docs.length} docs to ${filePath}`);
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


  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Press Any key to exit...', () => {
    rl.close();
  });
}

module.exports = { runIncrementalBackup };
