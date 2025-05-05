const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 👇 Set this to the correct backup folder you want to restore
const BACKUP_DATE_FOLDER = path.join(__dirname, 'user_exports', '2025-05-03');

// Backup All Files to the Firebase
// async function restoreFromBackup() {
//   const uids = fs.readdirSync(BACKUP_DATE_FOLDER);
//   for (const uid of uids) {
//     const uidPath = path.join(BACKUP_DATE_FOLDER, uid);
//     const stat = fs.statSync(uidPath);
//     if (!stat.isDirectory()) continue;

//     const levels = fs.readdirSync(uidPath);
//     for (const level of levels) {
//       const levelPath = path.join(uidPath, level);
//       const isRootLevelJson = level.endsWith('.json');

//       if (isRootLevelJson) {
//         // Restore files like profile.json
//         await restoreCollectionFromFile(uid, null, levelPath, level.replace('.json', ''));
//       } else {
//         // Restore subfolders like 2023-24/orders.json
//         const subfiles = fs.readdirSync(levelPath);
//         for (const subfile of subfiles) {
//           const filePath = path.join(levelPath, subfile);
//           await restoreCollectionFromFile(uid, level, filePath, subfile.replace('.json', ''));
//         }
//       }
//     }
//   }

//   console.log('✅ Restore completed');
// }

// async function restoreCollectionFromFile(uid, yearKey, filePath, collectionName) {
//     const raw = fs.readFileSync(filePath);
//     const documents = JSON.parse(raw);
  
//     const collectionPath = yearKey && yearKey !== '_root'
//       ? `${collectionName}` // You can modify this to include financialYear in path if desired
//       : collectionName;
  
//     console.log(`🔄 Restoring ${collectionName} for uid: ${uid} (${documents.length} docs)`);
  
//     for (const doc of documents) {
//       const docId = doc.id;
//       delete doc.id;
  
//       try {
//         await db.collection(collectionPath).doc(docId).set(doc, { merge: true });
//       } catch (error) {
//         console.error(`❌ Failed to write doc ${docId} in ${collectionPath}:`, error.message);
//       }
//     }
//   }
    
//   restoreFromBackup().catch(console.error);
  