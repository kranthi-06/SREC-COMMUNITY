const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');

// Multer Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
        } catch (err) { }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.get('/', protect, messageController.getInbox);
router.post('/send', protect, adminOnly, upload.single('attachment'), messageController.sendMessage);

module.exports = router;
