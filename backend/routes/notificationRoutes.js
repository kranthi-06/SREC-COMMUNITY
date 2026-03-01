const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { protect } = require('../middleware/authMiddleware');

// Get all notifications for the authenticated user
router.get('/', protect, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error fetching notifications' });
    }
});

// Get unread notification count
router.get('/unread-count', protect, async (req, res) => {
    try {
        const result = await query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [req.user.userId]
        );
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ error: 'Server error fetching unread count' });
    }
});

// Mark a single notification as read
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found or unauthorized' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error marking notification read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark all notifications as read
router.post('/mark-all-read', protect, async (req, res) => {
    try {
        await query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [req.user.userId]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Error marking all read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a single notification
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found or unauthorized' });
        }
        res.json({ message: 'Notification deleted successfully', id });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
