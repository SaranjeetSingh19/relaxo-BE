const express = require("express");
const router = express.Router();
const rewardCouponController = require("../controllers/rewardCoupon.controller");
const multer = require("multer");
const upload = multer();

router.use(express.json());

/* --------------------- SPECIAL ROUTES (ALWAYS FIRST) --------------------- */
// Export Route with logging middleware as per your example
router.get(
  "/export",
  (req, res, next) => {
    console.log("REWARD EXPORT ROUTE HIT ✔");
    next();
  },
  rewardCouponController.exportCoupons
);

router.post(
  "/import",
  upload.single("file"),
  rewardCouponController.importCoupons
);

// Special route for "Delete All"
// Note: It's safer to use a specific path for delete-all to avoid conflicting with :id
router.delete("/delete-all", rewardCouponController.deleteAllRewardCoupons);

// ⭐ Apply Coupon (User Checkout)
router.post("/apply", rewardCouponController.applyCoupon);

router.put("/global-min-amount", rewardCouponController.setGlobalMinAmount);

/* --------------------- CRUD ROUTES --------------------- */
// Create
router.post("/create", rewardCouponController.createRewardCoupon);

// Get All
router.get("/", rewardCouponController.getRewardCoupons);

// Update
router.put("/:id", rewardCouponController.updateRewardCoupon);

// Delete One
router.delete("/:id", rewardCouponController.deleteRewardCoupon);

// ⭐ NEW REPORT ROUTE (Using POST because we send complex filters in body)
router.post("/generate-report", rewardCouponController.generateCouponReport);

module.exports = router;