const constants = require('./constants')

// Update Invoice Taxable Amount
const { updateInvoiceTaxableAmount } = require("../firebase-admin/updater");
updateInvoiceTaxableAmount(constants.serviceAccountPath).catch(console.error);