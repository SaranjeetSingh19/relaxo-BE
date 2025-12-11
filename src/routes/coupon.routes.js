const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const multer = require("multer");
const upload = multer();

router.use(express.json());

/* --------------------- SPECIAL ROUTES (ALWAYS FIRST) --------------------- */
// router.get("/export", couponController.exportCoupons);
router.get("/export", couponController.exportCoupons); // 🔥 ALWAYS FIRST

router.post("/import", upload.single("file"), couponController.importCoupons);

router.get(
  "/export",
  (req, res, next) => {
    console.log("EXPORT ROUTE HIT ✔");
    next();
  },
  couponController.exportCoupons
);

/* --------------------- CRUD ROUTES --------------------- */
router.post("/reward-coupen", couponController.createCoupon);
router.put("/:id", couponController.updateCoupon);
router.get("/", couponController.getCoupons);
router.delete("/:id", couponController.deleteAllCoupons);

module.exports = router;
