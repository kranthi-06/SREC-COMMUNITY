/**
 * Post Routes — Community Posts API with B2 Cloud Storage
 * =========================================================
 * Supports two upload strategies:
 *   1. Small files (<4MB): Upload through server (multer → B2)
 *   2. Large files (>4MB): Chunked upload through server → B2
 */
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, postCreators } = require('../middleware/authMiddleware');
const multer = require('multer');
const b2Service = require('../services/b2Service');
const db = require('../db');
const crypto = require('crypto');

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

// Multer for chunk uploads (3.5MB max per chunk)
const chunkUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB max per chunk
});

// In-memory store for chunked uploads (per upload session)
const uploadSessions = new Map();

// Clean up stale sessions (older than 30 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of uploadSessions) {
        if (now - session.createdAt > 30 * 60 * 1000) {
            uploadSessions.delete(sessionId);
            console.log(`[Chunk Upload] Cleaned up stale session: ${sessionId}`);
        }
    }
}, 5 * 60 * 1000);

// GET all posts (paginated)
router.get('/', protect, postController.getAllPosts);

// GET storage info for current user
router.get('/storage-info', protect, postController.getStorageInfo);

/**
 * POST /api/posts/upload/init
 * Initialize a chunked upload session.
 * Body: { fileName, contentType, totalChunks, totalSize }
 */
router.post('/upload/init', protect, postCreators, async (req, res) => {
    try {
        const { fileName, contentType, totalChunks, totalSize } = req.body;

        if (!fileName || !contentType || !totalChunks) {
            return res.status(400).json({ error: 'fileName, contentType, and totalChunks are required' });
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/mov',
            'application/pdf'
        ];
        if (!allowedTypes.includes(contentType)) {
            return res.status(400).json({ error: `File type "${contentType}" is not allowed.` });
        }

        // Check upload limit
        const limitCheck = await b2Service.checkUploadLimit(db, req.user.userId, req.user.role);
        if (!limitCheck.canUpload) {
            return res.status(403).json({
                error: `Upload limit reached (${limitCheck.count}/${limitCheck.limit}). Delete existing posts to upload more.`
            });
        }

        const sessionId = crypto.randomBytes(16).toString('hex');

        uploadSessions.set(sessionId, {
            userId: req.user.userId,
            role: req.user.role,
            fileName,
            contentType,
            totalChunks: parseInt(totalChunks),
            totalSize: parseInt(totalSize) || 0,
            chunks: new Array(parseInt(totalChunks)).fill(null),
            receivedChunks: 0,
            createdAt: Date.now(),
        });

        console.log(`[Chunk Upload] Session created: ${sessionId} (${fileName}, ${totalChunks} chunks)`);
        res.json({ sessionId });
    } catch (error) {
        console.error('[Chunk Upload Init] Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to initialize upload' });
    }
});

/**
 * POST /api/posts/upload/chunk
 * Upload a single chunk. Uses multipart form with fields: sessionId, chunkIndex, and file 'chunk'.
 */
router.post('/upload/chunk', protect, postCreators, (req, res, next) => {
    chunkUpload.single('chunk')(req, res, (err) => {
        if (err) {
            console.error('Chunk upload error:', err);
            return res.status(400).json({ error: 'Chunk upload error: ' + err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { sessionId, chunkIndex } = req.body;
        const session = uploadSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Upload session not found or expired' });
        }

        if (session.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const idx = parseInt(chunkIndex);
        if (isNaN(idx) || idx < 0 || idx >= session.totalChunks) {
            return res.status(400).json({ error: 'Invalid chunk index' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No chunk data received' });
        }

        session.chunks[idx] = req.file.buffer;
        session.receivedChunks++;

        console.log(`[Chunk Upload] ${sessionId}: chunk ${idx + 1}/${session.totalChunks} received (${(req.file.buffer.length / 1024).toFixed(0)}KB)`);

        res.json({
            received: session.receivedChunks,
            total: session.totalChunks,
            complete: session.receivedChunks === session.totalChunks,
        });
    } catch (error) {
        console.error('[Chunk Upload] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/posts/upload/complete
 * Complete the chunked upload — reassemble chunks and upload to B2.
 * Body: { sessionId, content, link_url }
 */
router.post('/upload/complete', protect, postCreators, async (req, res) => {
    try {
        const { sessionId, content, link_url } = req.body;
        const session = uploadSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Upload session not found or expired' });
        }

        if (session.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.receivedChunks !== session.totalChunks) {
            return res.status(400).json({
                error: `Upload incomplete. Received ${session.receivedChunks}/${session.totalChunks} chunks.`
            });
        }

        // Reassemble the file from chunks
        const fileBuffer = Buffer.concat(session.chunks);
        console.log(`[Chunk Upload] ${sessionId}: Assembled file (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

        // Upload to B2
        const result = await b2Service.uploadFile(
            fileBuffer, session.fileName, session.contentType, session.userId, session.role
        );

        // Determine which URL field to use based on content type
        let image_url = null, video_url = null, pdf_url = null;
        if (session.contentType.startsWith('image/')) {
            image_url = result.fileUrl;
        } else if (session.contentType.startsWith('video/')) {
            video_url = result.fileUrl;
        } else if (session.contentType === 'application/pdf') {
            pdf_url = result.fileUrl;
        }

        // Create the post
        const postResult = await db.query(`
            INSERT INTO posts (author_id, content, image_url, video_url, link_url, pdf_url, file_size)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [session.userId, content || '', image_url, video_url, link_url || null, pdf_url, result.fileSize]);

        // Audit
        await req.audit('POST_CREATE', postResult.rows[0].id, {
            contentPreview: (content || '').substring(0, 100),
            hasImage: !!image_url,
            hasVideo: !!video_url,
            hasPdf: !!pdf_url,
            hasLink: !!link_url,
            fileSize: result.fileSize,
            storage: 'backblaze_b2',
            uploadMethod: 'chunked_upload'
        });

        // Clean up the session
        uploadSessions.delete(sessionId);

        console.log(`[Chunk Upload] ${sessionId}: Post created successfully (ID: ${postResult.rows[0].id})`);
        res.status(201).json({ message: 'Post created successfully', id: postResult.rows[0].id });
    } catch (error) {
        console.error('[Chunk Upload Complete] Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to complete upload' });
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


