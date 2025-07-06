const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(
    path.resolve(__dirname, 'serviceAccountKey.json')
  ),
});

const db = admin.firestore();

class FirebaseDbService {
  constructor(collectionName) {
    
    this.collection = db.collection(collectionName);
  }

  async addDocument(docId, data) {
    if (docId) {
      return this.collection.doc(docId).set(data);
    } else {
      const docRef = await this.collection.add(data);
      return docRef.id;
    }
  }

  async getDocument(docId) {
    const doc = await this.collection.doc(docId).get();
    if (!doc.exists) {
      throw new Error(`Document with ID ${docId} does not exist`);
    }
    return doc.data();
  }

  async updateDocument(docId, data) {
    return this.collection.doc(docId).update(data);
  }

  async deleteDocument(docId) {
    return this.collection.doc(docId).delete();
  }

  async listDocuments() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = FirebaseDbService;
