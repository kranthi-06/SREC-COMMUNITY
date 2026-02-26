/**
 * Review Routes — Private Review System API
 * ============================================
 * Admin: create, send-quick, list, analytics, export
 * Student: view inbox reviews, submit response
 */
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, adminOnly, studentOnly } = require('../middleware/authMiddleware');

// === ADMIN ROUTES ===
router.post('/admin/create', protect, adminOnly, reviewController.createReviewRequest);
router.post('/admin/send-quick', protect, adminOnly, reviewController.sendQuickReview);
router.get('/admin/requests', protect, adminOnly, reviewController.getAdminReviewRequests);
router.get('/admin/analytics/:requestId', protect, adminOnly, reviewController.getReviewAnalytics);
router.get('/admin/export/:requestId', protect, adminOnly, reviewController.exportReviewData);

// === STUDENT ROUTES ===
router.get('/student/inbox', protect, studentOnly, reviewController.getStudentInboxReviews);
router.post('/student/submit/:requestId', protect, studentOnly, reviewController.submitReviewResponse);

module.exports = router;
