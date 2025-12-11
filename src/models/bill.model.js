const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    sms: String,
    email: String,
    customerData: Object,
    loyaltyData: Object,
    storeData: Object,
    companyData: Object,
    transactionalData: Object,
    paymentData: Object,
    billAmountData: Object,
    taxesData: Object,
    billFooterData: Object,
    productsData: [Object]
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);
