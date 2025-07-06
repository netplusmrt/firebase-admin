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

async function updateInvoiceTaxableAmount(serviceAccountPath) {

  initFirestore(serviceAccountPath);
  const db = admin.firestore();

  const invoicesRef = db.collection('invoices');
  const snapshot = await invoicesRef
    .where('invoiceOptions.layoutId', '==', 1)
    .where('taxableAmount', '==', 0)
    .get();

  if (snapshot.empty) {
    console.log('No matching invoices found.');
    return;
  }

  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docRef = invoicesRef.doc(doc.id);
    console.log(`ℹ️ ${data.financialYear} ${data.invoiceNumber} ${data.invoiceOptions.layoutId} ${data.subTotal}`);

    if (typeof data.subTotal === 'number' && data.subTotal > 0) {
      batch.update(docRef, {
        taxableAmount: data.subTotal,
      });
      count++;

      // Commit every 500 docs
      if (count % 500 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  if (count % 500 !== 0) {
    await batch.commit(); // Commit remaining
  }

  console.log(`${snapshot.docs.length} Invoices found.`);
  console.log(`${count} documents updated.`);
}

module.exports = {
  updateInvoiceTaxableAmount
};