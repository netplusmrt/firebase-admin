const firebaseExport = require("../firebase-admin/export"); 

// Path to your service account key JSON file
firebaseExport.initFirestore('../accountancy-app-production-firebase-adminsdk-g22ib-316ed760c0')

firebaseExport.exportDataPerUIDAndYear(__dirname).catch(console.error);