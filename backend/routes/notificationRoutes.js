const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { protect } = require('../middleware/authMiddleware');

// ─── GET /notifications ────────────────────────────────────
// Fetch all notifications for the authenticated user
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

// ─── GET /notifications/unread-count ───────────────────────
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

// ─── PATCH /notifications/:id/read ─────────────────────────
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

// ─── POST /notifications/mark-all-read ─────────────────────
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

// ─── DELETE /notifications/:id ─────────────────────────────
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

// ─── POST /notifications/subscribe (Web Push) ──────────────
// Saves the PushManager subscription from the client's browser
router.post('/subscribe', protect, async (req, res) => {
    try {
        const subscription = req.body;

        // Validate subscription object
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription: missing endpoint' });
        }
        if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
            return res.status(400).json({ error: 'Invalid subscription: missing encryption keys' });
        }

        const { endpoint, keys } = subscription;
        const { p256dh, auth } = keys;

        // Upsert: if endpoint already exists, update user_id and keys
        await query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (endpoint) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh_key = EXCLUDED.p256dh_key,
                auth_key = EXCLUDED.auth_key,
                created_at = CURRENT_TIMESTAMP`,
            [req.user.userId, endpoint, p256dh, auth]
        );

        console.log(`[WebPush] Subscription saved for user ${req.user.userId}`);
        res.status(201).json({ message: 'Subscription saved successfully' });
    } catch (err) {
        console.error('Error saving subscription:', err);
        res.status(500).json({ error: 'Server error saving subscription' });
    }
});

module.exports = router;
