const db = require('../db');

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

exports.createPost = async (req, res) => {
    try {
        const { content, link_url } = req.body;
        let image_url = null;
        let pdf_url = null;

        if (req.files) {
            if (req.files.image) {
                const b64 = req.files.image[0].buffer.toString('base64');
                const mime = req.files.image[0].mimetype;
                image_url = `data:${mime};base64,${b64}`;
            }
            if (req.files.pdf) {
                const b64 = req.files.pdf[0].buffer.toString('base64');
                const mime = req.files.pdf[0].mimetype;
                pdf_url = `data:${mime};base64,${b64}`;
            }
        }

        if (!content && !image_url && !pdf_url && !link_url) {
            return res.status(400).json({ error: 'Cannot create an empty post.' });
        }

        const result = await db.query(`
            INSERT INTO posts (author_id, content, image_url, link_url, pdf_url)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [req.user.userId, content || '', image_url, link_url, pdf_url]);

        res.status(201).json({ message: 'Post created successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Server error creating post' });
    }
};

exports.likePost = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if liked
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

exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });

        await db.query(`
            INSERT INTO post_comments (post_id, user_id, content) 
            VALUES ($1, $2, $3)
        `, [id, req.user.userId, content]);

        res.status(201).json({ message: 'Comment added' });
    } catch (error) {
        res.status(500).json({ error: 'Server error adding comment' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const check = await db.query('SELECT user_id FROM post_comments WHERE id = $1', [commentId]);

        if (check.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

        const ownerId = check.rows[0].user_id;

        // Admin privileges or owner
        if (['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role) || ownerId === req.user.userId) {
            await db.query('DELETE FROM post_comments WHERE id = $1', [commentId]);
            res.json({ message: 'Comment deleted' });
        } else {
            res.status(403).json({ error: 'Unauthorized to delete this comment' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting comment' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const check = await db.query('SELECT author_id FROM posts WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

        const ownerId = check.rows[0].author_id;

        if (['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role) || ownerId === req.user.userId) {
            await db.query('DELETE FROM posts WHERE id = $1', [id]);
            res.json({ message: 'Post explicitly deleted' });
        } else {
            res.status(403).json({ error: 'Unauthorized to delete this post' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting post' });
    }
};
