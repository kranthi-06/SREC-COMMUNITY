/**
 * Auth Routes — Authentication API
 * ==================================
 * Registration, login, OTP verification, token refresh, and logout.
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public auth endpoints (rate-limited separately in server.js)
router.post('/:routeType/register', authController.register);
router.post('/:routeType/verify-otp', authController.verifyOTP);
router.post('/:routeType/login', authController.login);

// Token management
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);

module.exports = router;
