// src/models/couponAssignment.model.js
const mongoose = require("mongoose");

const couponAssignmentSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
  phone: { type: String, required: true },        // phone or userId per your app
  billId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", default: null },
  assignedAt: { type: Date, default: Date.now }
});

couponAssignmentSchema.index({ couponId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("CouponAssignment", couponAssignmentSchema);
