/**
 * Post Controller — Community Posts System with B2 Cloud Storage
 * ================================================================
 * CRUD for community posts with Backblaze B2 media storage.
 * Images, videos, and PDFs are uploaded to B2 cloud storage.
 * Role-based upload limits are enforced.
 * All mutations are audit-logged.
 */
const db = require('../db');
const b2Service = require('../services/b2Service');

/**
 * GET /api/posts
 * Get all community posts with like/comment counts.
 * Supports pagination via ?page=1&limit=20
 */
exports.getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const query = `
            SELECT p.id, p.content, p.image_url, p.video_url, p.link_url, p.pdf_url, 
                   p.file_size, p.created_at,
                   u.full_name as author_name, u.role as author_role,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments,
                   EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_has_liked
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await db.query(query, [req.user.userId, limit, offset]);

        // Get total count for pagination
        const countResult = await db.query('SELECT COUNT(*) as total FROM posts');
        const total = parseInt(countResult.rows[0].total);

        res.json({
            posts: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + limit < total,
            }
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Server error retrieving posts' });
    }
};

/**
 * POST /api/posts
 * Create a new community post. Faculty+ only.
 * Media files are uploaded to Backblaze B2 cloud storage.
 */
exports.createPost = async (req, res) => {
    try {
        const { content, link_url } = req.body;
        const userId = req.user.userId;
        const role = req.user.role;

        let image_url = null;
        let pdf_url = null;
        let video_url = null;
        let totalFileSize = 0;

        // Check upload limit if there are media files
        if (req.files && (req.files.image || req.files.video || req.files.pdf)) {
            const limitCheck = await b2Service.checkUploadLimit(db, userId, role);
            if (!limitCheck.canUpload) {
                return res.status(403).json({
                    error: `Upload limit reached. You have used ${limitCheck.count}/${limitCheck.limit} media uploads. Delete existing posts to upload more.`
                });
            }
        }

        // Upload media files to B2
        if (req.files) {
            if (req.files.image) {
                const file = req.files.image[0];
                const result = await b2Service.uploadFile(
                    file.buffer, file.originalname, file.mimetype, userId, role
                );
                image_url = result.fileUrl;
                totalFileSize += result.fileSize;
            }

            if (req.files.video) {
                const file = req.files.video[0];
                const result = await b2Service.uploadFile(
                    file.buffer, file.originalname, file.mimetype, userId, role
                );
                video_url = result.fileUrl;
                totalFileSize += result.fileSize;
            }

            if (req.files.pdf) {
                const file = req.files.pdf[0];
                const result = await b2Service.uploadFile(
                    file.buffer, file.originalname, file.mimetype, userId, role
                );
                pdf_url = result.fileUrl;
                totalFileSize += result.fileSize;
            }
        }

        if (!content && !image_url && !pdf_url && !link_url && !video_url) {
            return res.status(400).json({ error: 'Cannot create an empty post.' });
        }

        const result = await db.query(`
            INSERT INTO posts (author_id, content, image_url, video_url, link_url, pdf_url, file_size)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [userId, content || '', image_url, video_url, link_url, pdf_url, totalFileSize]);

        // Audit: Post Created
        await req.audit('POST_CREATE', result.rows[0].id, {
            contentPreview: (content || '').substring(0, 100),
            hasImage: !!image_url,
            hasVideo: !!video_url,
            hasPdf: !!pdf_url,
            hasLink: !!link_url,
            fileSize: totalFileSize,
            storage: 'backblaze_b2'
        });

        const systemEmitter = require('../utils/eventEmitter');
        systemEmitter.emit('POST_CREATED', {
            authorRole: role,
            postId: result.rows[0].id
        });

        res.status(201).json({ message: 'Post created successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating post:', error);
        // Provide specific error messages from B2 service
        const errorMsg = error.message || 'Server error creating post';
        res.status(error.message?.includes('limit') ? 403 : 500).json({ error: errorMsg });
    }
};

/**
 * POST /api/posts/:id/like
 * Toggle like on a post.
 */
exports.likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await db.query('SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, req.user.userId]);

        if (exists.rows.length > 0) {
            await db.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, req.user.userId]);
            res.json({ message: 'Post unliked' });
        } else {
            await db.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [id, req.user.userId]);
            res.status(201).json({ message: 'Post liked' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error recording like' });
    }
};

/**
 * GET /api/posts/:id/comments
 * Get all comments for a post.
 */
exports.getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT c.id, c.content, c.created_at, u.full_name as author_name, u.role as author_role, u.id as author_id
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await db.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving comments' });
    }
};

/**
 * POST /api/posts/:id/comments
 * Add a comment to a post. All authenticated users can comment.
 */
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
        if (content.length > 2000) return res.status(400).json({ error: 'Comment too long. Maximum 2000 characters.' });

        await db.query(`
            INSERT INTO post_comments (post_id, user_id, content) 
            VALUES ($1, $2, $3)
        `, [id, req.user.userId, content.trim()]);

        res.status(201).json({ message: 'Comment added' });
    } catch (error) {
        res.status(500).json({ error: 'Server error adding comment' });
    }
};

/**
 * DELETE /api/posts/comments/:commentId
 * Delete a comment. Owner or admin can delete.
 */
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const check = await db.query('SELECT user_id FROM post_comments WHERE id = $1', [commentId]);

        if (check.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

        const ownerId = check.rows[0].user_id;

        if (['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role) || ownerId === req.user.userId) {
            await db.query('DELETE FROM post_comments WHERE id = $1', [commentId]);

            await req.audit('COMMENT_DELETE', commentId, { postCommentOwner: ownerId });

            res.json({ message: 'Comment deleted' });
        } else {
            res.status(403).json({ error: 'Unauthorized to delete this comment' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting comment' });
    }
};

/**
 * DELETE /api/posts/:id
 * Delete a post. Owner or admin can delete.
 * Also deletes associated media from B2 cloud storage.
 */
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const check = await db.query('SELECT author_id, image_url, video_url, pdf_url FROM posts WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

        const post = check.rows[0];
        const ownerId = post.author_id;

        if (['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role) || ownerId === req.user.userId) {
            // Delete media files from B2 cloud storage
            const mediaUrls = [post.image_url, post.video_url, post.pdf_url].filter(Boolean);
            for (const url of mediaUrls) {
                const fileName = b2Service.getFileNameFromUrl(url);
                if (fileName) {
                    // Fire and forget — don't block post deletion if B2 delete fails
                    b2Service.deleteFile(fileName).catch(err => {
                        console.warn(`⚠️ Failed to delete B2 file: ${fileName}`, err.message);
                    });
                }
            }

            await db.query('DELETE FROM posts WHERE id = $1', [id]);

            await req.audit('POST_DELETE', id, { postOwner: ownerId, deletedMedia: mediaUrls.length });

            res.json({ message: 'Post deleted' });
        } else {
            res.status(403).json({ error: 'Unauthorized to delete this post' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting post' });
    }
};

/**
 * GET /api/posts/storage-info
 * Get storage usage info for the current user.
 */
exports.getStorageInfo = async (req, res) => {
    try {
        const limitInfo = await b2Service.checkUploadLimit(db, req.user.userId, req.user.role);

        // Get total size of user's uploads
        const sizeResult = await db.query(
            'SELECT COALESCE(SUM(file_size), 0) as total_size FROM posts WHERE author_id = $1',
            [req.user.userId]
        );

        res.json({
            ...limitInfo,
            totalSize: parseInt(sizeResult.rows[0].total_size) || 0,
            totalSizeMB: ((parseInt(sizeResult.rows[0].total_size) || 0) / (1024 * 1024)).toFixed(2),
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error getting storage info' });
    }
};
