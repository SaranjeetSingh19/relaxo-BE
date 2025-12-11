const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phone: String,
    otp: String
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema);