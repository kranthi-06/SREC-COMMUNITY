const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/:routeType/register', authController.register);
router.post('/:routeType/verify-otp', authController.verifyOTP);
router.post('/:routeType/login', authController.login);

module.exports = router;
