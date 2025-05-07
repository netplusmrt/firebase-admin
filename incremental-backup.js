const { runIncrementalBackup } = require('../firebase-admin/incrementalBackup');
const constants = require('./constants')

runIncrementalBackup(constants.serviceAccountPath).catch(console.error);
