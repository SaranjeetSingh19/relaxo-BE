  const mongoose = require("mongoose");

  const couponSchema = new mongoose.Schema(
    {
      // Coupon Code (Uppercase + Unique for better grouping)
      couponCode: {
        type: String,
        required: [true, "Coupon code is required"],
        trim: true,
        uppercase: true,
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

      // Validity (Optional)
      validityStartDate: {
        type: Date,
        default: null,
      },

      validityEndDate: {
        type: Date,
        default: null,
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
  couponSchema.virtual("remaining").get(function () {
    return this.totalCount - this.usedCount;
  });

  module.exports = mongoose.model("Coupon", couponSchema);
