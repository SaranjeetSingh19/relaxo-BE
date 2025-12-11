const RewardCoupon = require("../models/rewardCoupon.model"); // Ensure path is correct
const fs = require("fs"); // Used for file handling if needed for import/export


/* =======================================================
   ⭐ UPDATE GLOBAL MIN AMOUNT (APPLY TO ALL)
   This sets the same minAmount for EVERY coupon in the DB
======================================================= */
exports.setGlobalMinAmount = async (req, res) => {
  try {
    const { minAmount } = req.body;

    // 1. Validation
    if (minAmount === undefined || minAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid positive minAmount",
      });
    }

    // 2. Update ALL documents in the collection
    // The first {} means "match all", the second is the update
    const result = await RewardCoupon.updateMany(
      {},
      { $set: { minAmount: minAmount } }
    );

    res.status(200).json({
      success: true,
      message: `Global Minimum Amount updated to ${minAmount}`,
      modifiedCount: result.modifiedCount, // Tells you how many coupons were updated
    });
  } catch (error) {
    console.log("GLOBAL UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* =======================================================
   CREATE REWARD COUPON
======================================================= */
exports.createRewardCoupon = async (req, res) => {
  try {
    let {
      couponCode,
      description,
      discount,
      status,
      quantity, // Frontend sends "quantity"
      isAssigned,
      // ❌ Removed minAmount from here
    } = req.body;

    // 1. Validation
    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity (Usage Limit) must be at least 1",
      });
    }

    // 2. Formatting
    couponCode = couponCode.toUpperCase();

    // 3. Create
    const newCoupon = await RewardCoupon.create({
      couponCode,
      description,
      discount,
      status: status?.toLowerCase() || "active",
      totalCount: quantity, // Map quantity to totalCount
      usedCount: 0,
      isAssigned: isAssigned || false,
      // ❌ Removed minAmount field setting (will use schema default)
    });

    res.status(201).json({
      success: true,
      message: "Reward Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (error) {
    console.log("CREATE REWARD COUPON ERROR:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon code already exists!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};



/* =======================================================
   UPDATE REWARD COUPON
======================================================= */
exports.updateRewardCoupon = async (req, res) => {
  try {
    const id = req.params.id;

    let {
      couponCode,
      description,
      discount,
      status,
      quantity, // Frontend might send "quantity"
      totalCount, // Or "totalCount"
      isAssigned,
      usedCount,
      // ❌ Removed minAmount from here
    } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    couponCode = couponCode.toUpperCase();

    // Determine the new total limit
    const finalTotalCount = quantity ? quantity : totalCount;

    const updated = await RewardCoupon.findByIdAndUpdate(
      id,
      {
        couponCode,
        description,
        discount,
        status: status?.toLowerCase(),
        totalCount: finalTotalCount,
        usedCount,
        isAssigned,
        // ❌ Removed minAmount update logic
      },
      { new: true } // Return the updated document
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Reward Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reward Coupon updated successfully",
      coupon: updated,
    });
  } catch (error) {
    console.log("UPDATE REWARD COUPON ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =======================================================
   GET ALL REWARD COUPONS
======================================================= */
exports.getRewardCoupons = async (req, res) => {
  try {
    // You can add pagination logic here later if needed
    const coupons = await RewardCoupon.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.log("GET REWARD COUPONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =======================================================
   DELETE SINGLE REWARD COUPON
======================================================= */
exports.deleteRewardCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RewardCoupon.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Reward Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reward Coupon deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =======================================================
   DELETE ALL REWARD COUPONS (Backend Logic)
======================================================= */
exports.deleteAllRewardCoupons = async (req, res) => {
  try {
    await RewardCoupon.deleteMany({});
    res.status(200).json({
      success: true,
      message: "All reward coupons deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =======================================================
   EXPORT (Placeholder matching your structure)
======================================================= */
exports.exportCoupons = async (req, res) => {
  try {
    // Implement your CSV/Excel logic here
    const coupons = await RewardCoupon.find();
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =======================================================
   IMPORT (Placeholder matching your structure)
======================================================= */
exports.importCoupons = async (req, res) => {
  try {
    // Access file via req.file (thanks to multer)
    // Implement parsing logic here
    res
      .status(200)
      .json({ success: true, message: "Import functionality pending" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/* =======================================================
   GENERATE & DOWNLOAD FILTERED REPORT (CSV)
======================================================= */
exports.generateCouponReport = async (req, res) => {
  try {
    const { status, assignment, couponCode, description } = req.body;

    // 1. Build Dynamic Query
    let query = {};

    // Filter by Status
    if (status && status !== "Any") {
      query.status = status.toLowerCase();
    }

    // Filter by Assignment (Frontend sends "Any", "Assigned", "Unassigned")
    if (assignment && assignment !== "Any") {
      query.isAssigned = assignment === "Assigned" ? true : false;
    }

    // Filter by Coupon Code (Partial Match)
    if (couponCode) {
      query.couponCode = { $regex: couponCode, $options: "i" }; // Case insensitive
    }

    // Filter by Description (Partial Match)
    if (description) {
      query.description = { $regex: description, $options: "i" };
    }

    // 2. Fetch Data
    const coupons = await RewardCoupon.find(query).sort({ createdAt: -1 });

    // 3. Convert to CSV Format (Manual conversion to avoid dependencies)
    const headers = [
      "Coupon Code",
      "Description",
      "Discount",
      "Status",
      "Assigned?",
      "Usage Limit",
      "Used Count",
      "Min Order Amount",
      "Created At"
    ];

    // Map data to rows
    const csvRows = coupons.map(c => [
      c.couponCode,
      `"${c.description.replace(/"/g, '""')}"`, // Escape quotes in description
      c.discount,
      c.status,
      c.isAssigned ? "Yes" : "No",
      c.totalCount,
      c.usedCount,
      c.minAmount,
      new Date(c.createdAt).toLocaleDateString()
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","), // Header Row
      ...csvRows.map(row => row.join(",")) // Data Rows
    ].join("\n");

    // 4. Send Response as File
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", 'attachment; filename="coupon_report.csv"');
    res.status(200).send(csvContent);

  } catch (error) {
    console.log("REPORT GENERATION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



/* =======================================================
   ⭐ APPLY COUPON (USER SIDE)
   Validates code, status, usage limit, and min amount
======================================================= */
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, cartTotal } = req.body;

    // 1. Basic Validation
    if (!couponCode) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a coupon code" 
      });
    }

    if (cartTotal === undefined || cartTotal < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cart total is invalid" 
      });
    }

    // 2. Find Coupon (Case Insensitive)
    const coupon = await RewardCoupon.findOne({ 
      couponCode: couponCode.toUpperCase() 
    });

    // 3. Check if Coupon Exists
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        message: "Invalid coupon code" 
      });
    }

    // 4. Check Status (Active/Inactive)
    if (coupon.status !== "active") {
      return res.status(400).json({ 
        success: false, 
        message: "This coupon is currently inactive" 
      });
    }

    // 5. Check Usage Limit (Quantity)
    // If usedCount is greater than or equal to totalCount, it's exhausted.
    if (coupon.usedCount >= coupon.totalCount) {
      return res.status(400).json({ 
        success: false, 
        message: "This coupon has reached its usage limit" 
      });
    }

    // 6. Check Minimum Order Amount
    // If the cart total is LESS than the coupon's minAmount, reject it.
    if (cartTotal < coupon.minAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum order amount of ₹${coupon.minAmount} is required to use this coupon` 
      });
    }

    // 7. Success! Return Coupon Details
    // Note: We do NOT increment 'usedCount' here. 
    // 'usedCount' should only increase when the order is successfully PLACED, not just applied.
    
    res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      coupon: {
        code: coupon.couponCode,
        discount: coupon.discount, // e.g., "20% OFF" or "500"
        minAmount: coupon.minAmount,
        description: coupon.description
      }
    });

  } catch (error) {
    console.log("APPLY COUPON ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};