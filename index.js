const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const fs = require('fs')
const FirebaseDbService = require('./services/firebaseDbService');
const invoiceService = new FirebaseDbService('invoices');;

const app = express();
app.use(cors());
app.use(express.json());

let initialized = false;

function initFirestore(serviceAccountPath) {
  if (initialized) return;

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  initialized = true;
}

// Get Invoices
app.post('/invoices', async (req, res) => {
  // const { collectionName } = req.body;
  
  try {

    // List all invoices
    const invoices = await invoiceService.listDocuments();
    console.log('Invoices:', invoices);

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});


// const FirebaseDbService = require('./firebaseDbService');

// const productService = new FirebaseDbService('products');

// async function main() {
//   // Add a product
//   const productId = await productService.addDocument(null, {
//     name: 'Apple',
//     price: 1.5,
//     stock: 100,
//   });
//   console.log('Added Product ID:', productId);

//   // List all products
//   const products = await productService.listDocuments();
//   console.log('Products:', products);

//   // Update a product
//   await productService.updateDocument(productId, { stock: 95 });

//   // Get single product
//   const product = await productService.getDocument(productId);
//   console.log('Product:', product);

//   // Delete product
//   // await productService.deleteDocument(productId);
//   // console.log('Deleted product');
// }

// main().catch(console.error);