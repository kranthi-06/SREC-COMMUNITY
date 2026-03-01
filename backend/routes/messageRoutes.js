/**
 * Message Routes — Inbox & Messaging API
 * ========================================
 */
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Use memory storage so file buffer is available for B2 upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
        }
    }
});

router.get('/', protect, messageController.getInbox);
router.post('/send', protect, adminOnly, upload.single('attachment'), messageController.sendMessage);
router.post('/reply', protect, adminOnly, messageController.replyToAdmin);
router.put('/notifications/:id/read', protect, messageController.markNotificationRead);

module.exports = router;

