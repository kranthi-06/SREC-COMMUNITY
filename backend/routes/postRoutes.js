/**
 * Post Routes — Community Posts API with B2 Cloud Storage
 * =========================================================
 * Supports two upload strategies:
 *   1. Small files (<4MB): Upload through server (multer → B2)
 *   2. Large files (>4MB): Direct browser-to-B2 upload via presigned URLs
 */
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, postCreators } = require('../middleware/authMiddleware');
const multer = require('multer');
const b2Service = require('../services/b2Service');
const db = require('../db');

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

/**
 * GET /api/posts/upload-url
 * Get a presigned B2 upload URL for direct browser-to-B2 uploads.
 * This bypasses Vercel's 4.5MB serverless function body limit.
 * Query params: fileName, contentType
 */
router.get('/upload-url', protect, postCreators, async (req, res) => {
    try {
        const { fileName, contentType } = req.query;
        if (!fileName || !contentType) {
            return res.status(400).json({ error: 'fileName and contentType are required' });
        }

        // Check upload limit
        const limitCheck = await b2Service.checkUploadLimit(db, req.user.userId, req.user.role);
        if (!limitCheck.canUpload) {
            return res.status(403).json({
                error: `Upload limit reached (${limitCheck.count}/${limitCheck.limit}). Delete existing posts to upload more.`
            });
        }

        const result = await b2Service.getPresignedUploadUrl(
            req.user.userId, req.user.role, fileName, contentType
        );

        res.json(result);
    } catch (error) {
        console.error('[Upload URL] Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to get upload URL' });
    }
});

/**
 * POST /api/posts/create-with-urls
 * Create a post using pre-uploaded B2 media URLs (no file upload through server).
 * Used after the browser has directly uploaded files to B2 via presigned URLs.
 */
router.post('/create-with-urls', protect, postCreators, async (req, res) => {
    try {
        const { content, link_url, image_url, video_url, pdf_url, file_size } = req.body;

        if (!content && !image_url && !video_url && !pdf_url && !link_url) {
            return res.status(400).json({ error: 'Cannot create an empty post.' });
        }

        const result = await db.query(`
            INSERT INTO posts (author_id, content, image_url, video_url, link_url, pdf_url, file_size)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [req.user.userId, content || '', image_url || null, video_url || null, link_url || null, pdf_url || null, file_size || 0]);

        // Audit: Post Created
        await req.audit('POST_CREATE', result.rows[0].id, {
            contentPreview: (content || '').substring(0, 100),
            hasImage: !!image_url,
            hasVideo: !!video_url,
            hasPdf: !!pdf_url,
            hasLink: !!link_url,
            fileSize: file_size || 0,
            storage: 'backblaze_b2',
            uploadMethod: 'direct_browser_upload'
        });

        res.status(201).json({ message: 'Post created successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating post with URLs:', error);
        res.status(500).json({ error: error.message || 'Server error creating post' });
    }
});

// CREATE post with media upload to B2 (server-side upload, for small files)
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

