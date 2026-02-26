const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, postCreators } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', protect, postController.getAllPosts);
router.post('/', protect, postCreators, (req, res, next) => {
    upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }])(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        }
        next();
    });
}, postController.createPost);
router.delete('/:id', protect, postController.deletePost);

router.post('/:id/like', protect, postController.likePost);
router.get('/:id/comments', protect, postController.getComments);
router.post('/:id/comments', protect, postController.addComment);
router.delete('/comments/:commentId', protect, postController.deleteComment);

module.exports = router;
