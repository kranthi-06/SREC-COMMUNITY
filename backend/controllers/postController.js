/**
 * Post Controller — Community Posts System
 * ==========================================
 * CRUD for community posts with likes and comments.
 * Students can view/like/comment but cannot create posts.
 * All mutations are audit-logged.
 */
const db = require('../db');

/**
 * GET /api/posts
 * Get all community posts with like/comment counts.
 */
exports.getAllPosts = async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.content, p.image_url, p.link_url, p.pdf_url, p.created_at,
                   u.full_name as author_name, u.role as author_role,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments,
                   EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_has_liked
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(query, [req.user.userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Server error retrieving posts' });
    }
};

/**
 * POST /api/posts
 * Create a new community post. Faculty+ only.
 * Images are converted to base64 data URIs for persistent storage.
 */
exports.createPost = async (req, res) => {
    try {
        const { content, link_url } = req.body;
        let image_url = null;
        let pdf_url = null;

        if (req.files) {
            // Convert image to base64 data URI for DB storage
            // This ensures images persist on Vercel (ephemeral /tmp) and work everywhere
            if (req.files.image) {
                const imageFile = req.files.image[0];
                const fs = require('fs');
                try {
                    const imageBuffer = fs.readFileSync(imageFile.path);
                    const mimeType = imageFile.mimetype || 'image/jpeg';
                    image_url = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
                    // Clean up temp file
                    try { fs.unlinkSync(imageFile.path); } catch (e) { }
                } catch (readErr) {
                    console.error('Failed to read image file:', readErr);
                    image_url = `/uploads/${imageFile.filename}`;
                }
            }
            if (req.files.pdf) {
                pdf_url = `/uploads/${req.files.pdf[0].filename}`;
            }
        }

        if (!content && !image_url && !pdf_url && !link_url) {
            return res.status(400).json({ error: 'Cannot create an empty post.' });
        }

        const result = await db.query(`
            INSERT INTO posts (author_id, content, image_url, link_url, pdf_url)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [req.user.userId, content || '', image_url, link_url, pdf_url]);

        // Audit: Post Created
        await req.audit('POST_CREATE', result.rows[0].id, {
            contentPreview: (content || '').substring(0, 100),
            hasImage: !!image_url,
            hasPdf: !!pdf_url,
            hasLink: !!link_url
        });

        res.status(201).json({ message: 'Post created successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Server error creating post' });
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
 */
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const check = await db.query('SELECT author_id FROM posts WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

        const ownerId = check.rows[0].author_id;

        if (['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role) || ownerId === req.user.userId) {
            await db.query('DELETE FROM posts WHERE id = $1', [id]);

            await req.audit('POST_DELETE', id, { postOwner: ownerId });

            res.json({ message: 'Post deleted' });
        } else {
            res.status(403).json({ error: 'Unauthorized to delete this post' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting post' });
    }
};
