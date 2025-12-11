const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    phone: String,
    message: String,
    stars: Number,
    reply: String,
    bill_id: String
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
