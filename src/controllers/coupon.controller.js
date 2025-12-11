const Coupon = require("../models/coupon.model");
const ExcelJS = require("exceljs");

/* =======================================================
   GET ALL COUPONS (with pagination + search)
======================================================= */
exports.getCoupons = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    if (search) {
      filter.$or = [
        { couponCode: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const totalCount = await Coupon.countDocuments(filter);

    const coupons = await Coupon.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      coupons,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignCoupon = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    // ⭐ STEP 1: Find coupon with remaining > 0
    const coupon = await Coupon.findOneAndUpdate(
      {
        status: "active",
        $expr: { $gt: ["$totalCount", "$usedCount"] }
      },
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "No coupon available"
      });
    }

    // ⭐ STEP 2: Save assignment to DB
    const assignedData = {
      phone,
      couponCode: coupon.couponCode,
      description: coupon.description,
      discount: coupon.discount,
      redeemed: false,
      assignedAt: new Date()
    };

    // You can store this in a separate collection if desired:
    // await CouponAssignment.create({ couponId: coupon._id, phone, assignedAt: Date.now() });
    // For now we send back to frontend.

    const remaining = coupon.totalCount - coupon.usedCount;

    return res.json({
      success: true,
      coupon: {
        ...coupon._doc,
        remaining,
        phoneAssigned: phone
      }
    });

  } catch (err) {
    console.log("ASSIGN ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =======================================================
   CREATE COUPON
======================================================= */
exports.createCoupon = async (req, res) => {
  try {
    let {
      couponCode,
      description,
      discount,
      status,
      quantity, // Frontend sends "quantity"
      isAssigned // Added this to capture assignment status
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
    const coupon = await Coupon.create({
      couponCode,
      description,
      discount,
      status: status?.toLowerCase() || "active",
      totalCount: quantity, // ⭐ Map quantity to totalCount
      usedCount: 0,
      isAssigned: isAssigned || false, // Use the value passed from frontend
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });

  } catch (error) {
    console.log("CREATE COUPON ERROR:", error);
    // Handle duplicate key error (E11000) specifically if needed
    if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "Coupon code already exists!" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =======================================================
   UPDATE COUPON
======================================================= */
exports.updateCoupon = async (req, res) => {
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
    } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    couponCode = couponCode.toUpperCase();

    // Determine the new total limit
    // If 'quantity' is sent, use it. Otherwise fall back to 'totalCount'.
    const finalTotalCount = quantity ? quantity : totalCount;

    const updated = await Coupon.findByIdAndUpdate(
      id,
      {
        couponCode,
        description,
        discount,
        status: status?.toLowerCase(),
        totalCount: finalTotalCount, // Update the limit
        usedCount, // Be careful updating this manually, usually handled by redemption logic
        isAssigned
      },
      { new: true } // Return the updated document
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updated,
    });

  } catch (error) {
    console.log("UPDATE COUPON ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



/* =======================================================
   DELETE COUPON
======================================================= */
// exports.deleteCoupon = async (req, res) => {
//   try {
//     const deleted = await Coupon.findByIdAndDelete(req.params.id);

//     if (!deleted) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Coupon deleted successfully",
//     });

//   } catch (error) {
//     console.log("DELETE COUPON ERROR:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.deleteAllCoupons = async () => {
  if (!window.confirm("Are you sure? All coupons will be deleted!")) return;

  try {
    await axios.delete(`${baseURL}/reward-coupen/delete-all`);
    loadCoupons(1);
  } catch (err) {
    console.log(err);
  }
};


/* =======================================================
   IMPORT COUPONS FROM EXCEL
======================================================= */
exports.importCoupons = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1);

    let successCount = 0;
    let failCount = 0;

    const rows = [];

    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;

      const [
        couponCode,
        description,
        discount,
        startDate,
        endDate,
        status,
      ] = row.values.slice(1);

      if (!couponCode || !description) {
        failCount++;
        return;
      }

      rows.push({
        couponCode: couponCode.toUpperCase(),
        description,
        discount,
        validityStartDate: startDate ? new Date(startDate) : null,
        validityEndDate: endDate ? new Date(endDate) : null,
        status: status?.toLowerCase() || "active",
        totalCount: 1,
        usedCount: 0,
      });
    });

    for (const row of rows) {
      try {
        await Coupon.create(row);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: "Import completed",
      imported: successCount,
      failed: failCount,
    });

  } catch (error) {
    console.log("IMPORT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



/* =======================================================
   EXPORT COUPONS TO EXCEL
======================================================= */
exports.exportCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Coupons");

    sheet.columns = [
      { header: "Coupon Code", key: "couponCode", width: 25 },
      { header: "Description", key: "description", width: 35 },
      { header: "Discount", key: "discount", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Total", key: "totalCount", width: 10 },
      { header: "Used", key: "usedCount", width: 10 },
      { header: "Remaining", key: "remaining", width: 12 },
      { header: "Created", key: "createdAt", width: 22 }
    ];

    sheet.getRow(1).font = { bold: true };

    coupons.forEach(c => {
      sheet.addRow({
        couponCode: c.couponCode,
        description: c.description,
        discount: c.discount || "-",
        status: c.status,
        totalCount: c.totalCount,
        usedCount: c.usedCount,
        remaining: c.totalCount - c.usedCount,
        createdAt: new Date(c.createdAt).toLocaleString(),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=coupons_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.log("EXPORT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Export failed: " + err.message
    });
  }
};
