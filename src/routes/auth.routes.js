const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', authController.register); // Register (admin/user)
router.post('/login', authController.login);       // Login and get token

router.use(authMiddleware('admin'));
router.put('/update', authController.updateUser); // Update user details

module.exports = router;
