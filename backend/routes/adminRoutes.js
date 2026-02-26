/**
 * Admin Routes — Command Centre API
 * ====================================
 * All routes require authentication + admin role.
 * Role changes and deletions require BLACK_HAT clearance.
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, protectStrict, blackHatOnly, adminOnly } = require('../middleware/authMiddleware');

// User Management
router.get('/users', protect, adminOnly, adminController.getAllUsers);

// Platform Statistics
router.get('/stats', protect, adminOnly, adminController.getStats);

// Audit Logs (admin viewable, for transparency)
router.get('/audit-logs', protect, adminOnly, adminController.getAuditLogs);

// Role Promotion/Demotion — BLACK_HAT ONLY with strict DB-verified auth
router.put('/role', protectStrict, blackHatOnly, adminController.updateRole);

// User Deletion — BLACK_HAT ONLY
router.delete('/user/:userId', protectStrict, blackHatOnly, adminController.deleteUser);

module.exports = router;
