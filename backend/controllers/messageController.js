/**
 * Message Controller — Inbox Messaging System
 * ==============================================
 * Admin-to-user messaging with file attachments.
 * All messages are audit-logged.
 */
const db = require('../db');

/**
 * GET /api/messages
 * Get inbox messages for the current user.
 * Includes messages AND system notifications.
 */
exports.getInbox = async (req, res) => {
    try {
        // Fetch messages
        const messagesResult = await db.query(`
            SELECT m.id, m.message_text, m.file_url, m.created_at, 
                   s.full_name as sender_name, s.role as sender_role,
                   'message' as item_type
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            WHERE m.receiver_id = $1
            ORDER BY m.created_at DESC
        `, [req.user.userId]);

        // Fetch system notifications
        const notifResult = await db.query(`
            SELECT id, title as sender_name, body as message_text, 
                   type as sender_role, is_read, created_at,
                   NULL as file_url,
                   'notification' as item_type
            FROM system_notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.userId]);

        // Merge and sort by date
        const combined = [...messagesResult.rows, ...notifResult.rows]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(combined);
    } catch (error) {
        console.error('Error fetching inbox:', error);
        // Fallback: try just messages if notifications table doesn't exist yet
        try {
            const result = await db.query(`
                SELECT m.id, m.message_text, m.file_url, m.created_at, 
                       s.full_name as sender_name, s.role as sender_role
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                WHERE m.receiver_id = $1
                ORDER BY m.created_at DESC
            `, [req.user.userId]);
            res.json(result.rows);
        } catch (fallbackError) {
            res.status(500).json({ error: 'Server error fetching inbox messages' });
        }
    }
};

/**
 * POST /api/messages/send
 * Send a message to one or more users. Admin only.
 */
exports.sendMessage = async (req, res) => {
    try {
        const { receiver_ids, message_text } = req.body;
        let file_url = null;

        if (req.file) {
            file_url = `/uploads/${req.file.filename}`;
        }

        // Parse receiver IDs
        let receivers = [];
        try {
            receivers = JSON.parse(receiver_ids);
        } catch (e) {
            receivers = Array.isArray(receiver_ids) ? receiver_ids : [receiver_ids];
        }

        if (!receivers || receivers.length === 0) {
            return res.status(400).json({ error: 'At least one receiver ID is required.' });
        }

        if (!message_text && !file_url) {
            return res.status(400).json({ error: 'Message text or attachment is required.' });
        }

        // Insert message for each receiver
        for (const receiver_id of receivers) {
            await db.query(`
                INSERT INTO messages (sender_id, receiver_id, message_text, file_url)
                VALUES ($1, $2, $3, $4)
            `, [req.user.userId, receiver_id, message_text || '', file_url]);
        }

        // Audit: Message Sent
        await req.audit('MESSAGE_SEND', null, {
            recipientCount: receivers.length,
            hasAttachment: !!file_url,
            messagePreview: (message_text || '').substring(0, 100)
        });

        // Emit Notification Event
        const systemEmitter = require('../utils/eventEmitter');
        systemEmitter.emit('MESSAGE_SENT', {
            senderRole: req.user.role,
            recipientIds: receivers,
            messageContent: message_text || 'Sent an attachment',
            referenceId: null // or some thread ID if we had one
        });

        res.status(201).json({ message: 'Message(s) sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Server error sending message' });
    }
};

/**
 * PUT /api/messages/notifications/:id/read
 * Mark a notification as read.
 */
exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            'UPDATE system_notifications SET is_read = true WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/messages/reply
 * Admin replies from inbox — sends to all other admin-level users.
 * Only accessible by admin/black_hat_admin/editor_admin.
 */
exports.replyToAdmin = async (req, res) => {
    try {
        const { message_text } = req.body;
        const senderId = req.user.userId;

        if (!message_text || !message_text.trim()) {
            return res.status(400).json({ error: 'Message text is required.' });
        }

        // Find all other admin-level users (excluding the sender)
        const recipients = await db.query(
            `SELECT id FROM users WHERE role IN ('admin', 'black_hat_admin', 'editor_admin') AND id != $1`,
            [senderId]
        );

        if (recipients.rows.length === 0) {
            return res.status(400).json({ error: 'No other administrators found to receive the message.' });
        }

        // Insert message for each recipient
        for (const recipient of recipients.rows) {
            await db.query(`
                INSERT INTO messages (sender_id, receiver_id, message_text)
                VALUES ($1, $2, $3)
            `, [senderId, recipient.id, message_text.trim()]);
        }

        // Audit: Admin Reply
        await req.audit('MESSAGE_REPLY', null, {
            recipientCount: recipients.rows.length,
            messagePreview: message_text.substring(0, 100)
        });

        // Emit Notification Event
        const systemEmitter = require('../utils/eventEmitter');
        systemEmitter.emit('MESSAGE_SENT', {
            senderRole: req.user.role,
            recipientIds: recipients.rows.map(r => r.id),
            messageContent: message_text,
            referenceId: null
        });

        res.status(201).json({ message: `Reply sent to ${recipients.rows.length} administrators.` });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ error: 'Server error sending reply' });
    }
};
