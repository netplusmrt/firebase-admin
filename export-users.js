const { exportUsers } = require("../firebase-admin/exportUsers"); 
const constants = require('./constants')

exportUsers(constants.serviceAccountPath).catch(console.error);