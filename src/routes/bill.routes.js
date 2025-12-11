const express = require('express');
const router = express.Router();
const billController = require('../controllers/bill.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public route
router.get('/:phone', billController.getBillByPhone);
router.get('/billsbyid/:id', billController.getBillById);

router.post('/send-otp', billController.sendOtp);
router.post('/verify-otp', billController.verifyOtp);

// Admin-only routes

router.post('/', billController.createBill);

router.use(authMiddleware('admin'));
router.get('/', billController.listBills);
router.get('/admin/export', billController.exportBillsToExcel);
router.get('/dashboard/monthly-stats', billController.getMonthlyDashboardStats);
module.exports = router;
