const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, blackHatOnly, adminOnly } = require('../middleware/authMiddleware');

router.get('/users', protect, adminOnly, adminController.getAllUsers);

// Only Super Admins (Black Hat) can perform role promotions
router.put('/role', protect, blackHatOnly, adminController.updateRole);

module.exports = router;
