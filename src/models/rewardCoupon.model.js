const mongoose = require("mongoose");

const rewardCouponSchema = new mongoose.Schema(
  {
    // Coupon Code (Uppercase + Unique for better grouping)
    couponCode: {
      type: String,
      required: [true, "Coupon code is required"],
      trim: true,
      uppercase: true,
      unique: true, // I added unique: true here as it is best practice for coupon codes
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    discount: {
      type: String,
      default: "",
    },

    // ⭐ NEW FIELD: Minimum Amount required to apply this coupon
    minAmount: {
      type: Number,
      required: [true, "Minimum amount is required"],
      default: 0, // Default 0 means no minimum limit if you don't set one
      min: [0, "Minimum amount cannot be negative"],
    },

    // Active / Inactive
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // ⭐ TOTAL HOW MANY COUPONS YOU HAVE
    totalCount: {
      type: Number,
      required: true,
      min: [1, "Minimum 1 coupon required"],
    },

    // ⭐ HOW MANY ARE USED / ASSIGNED
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // When you assign coupon to user
    isAssigned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ⭐ VIRTUAL FIELD → Not stored in DB, only calculated
rewardCouponSchema.virtual("remaining").get(function () {
  return this.totalCount - this.usedCount;
});

module.exports = mongoose.model("RewardCoupon", rewardCouponSchema);