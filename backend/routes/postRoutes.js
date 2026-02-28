/**
 * Post Routes — Community Posts API with B2 Cloud Storage
 * =========================================================
 */
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, postCreators } = require('../middleware/authMiddleware');
const multer = require('multer');

// Use memory storage — buffers go straight to B2
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max per file
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/mov',
            'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type "${file.mimetype}" is not allowed.`), false);
        }
    }
});

// GET all posts (paginated)
router.get('/', protect, postController.getAllPosts);

// GET storage info for current user
router.get('/storage-info', protect, postController.getStorageInfo);

// CREATE post with media upload to B2
router.post('/', protect, postCreators, (req, res, next) => {
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum file size is 100MB.' });
            }
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        }
        next();
    });
}, postController.createPost);

// DELETE post (also deletes B2 media)
router.delete('/:id', protect, postController.deletePost);

// LIKE/UNLIKE post
router.post('/:id/like', protect, postController.likePost);

// COMMENTS
router.get('/:id/comments', protect, postController.getComments);
router.post('/:id/comments', protect, postController.addComment);
router.delete('/comments/:commentId', protect, postController.deleteComment);

module.exports = router;
