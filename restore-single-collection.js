const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../accountancy-app-dev-firebase-adminsdk-da82p-e37a0a5c28.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ✅ EDIT THESE
const BACKUP_DATE = '2025-05-04';
const UID = 'AexJIvCmnYc5sAGbIJKPtBvM4412';
const FINANCIAL_YEAR = '2023-24'; // Use '_root' if no financialYear folder
const COLLECTION_NAME = 'invoices'; // Without .json extension

async function restoreSingleCollection() {
    const filePath = path.join(
      __dirname,
      'user_exports',
      BACKUP_DATE,
      UID,
      FINANCIAL_YEAR === '_root' ? '' : FINANCIAL_YEAR,
      `${COLLECTION_NAME}.json`
    );
  
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
  
    const raw = fs.readFileSync(filePath);
    const documents = JSON.parse(raw);
  
    console.log(`🔄 Restoring ${documents.length} documents to "${COLLECTION_NAME}"`);
  
    for (const doc of documents) {
      const docId = doc.id;
      delete doc.id;
  
      try {
        await db.collection(COLLECTION_NAME).doc(docId).set(doc, { merge: true });
      } catch (error) {
        console.error(`❌ Failed to write doc ${docId}:`, error.message);
      }
    }
  
    console.log(`✅ Restored ${documents.length} docs to "${COLLECTION_NAME}"`);
  }

  restoreSingleCollection().catch(console.error);


