const { exportSingleCollection } = require("../firebase-admin/export");
const constants = require('./constants')

exportSingleCollection(constants.serviceAccountPath, process.argv[2]).catch(console.error);