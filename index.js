const { exportDataPerUIDAndYear } = require("../firebase-admin/export"); 
const constants = require('./constants')

exportDataPerUIDAndYear(constants.serviceAccountPath, process.argv[2]).catch(console.error);