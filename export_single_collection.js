const firebaseExport = require("../firebase-admin/export"); 

// Path to your service account key JSON file
const serviceAccountPath = '../accountancy-app-production-firebase-adminsdk-g22ib-316ed760c0.json'; // Path to your key

firebaseExport.exportSingleCollection(serviceAccountPath, process.argv[2]).catch(console.error);