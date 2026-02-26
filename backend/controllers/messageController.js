const db = require('../db');

exports.getInbox = async (req, res) => {
    try {
        // Fetch messages for the currently logged-in user
        const result = await db.query(`
            SELECT m.id, m.message_text, m.file_url, m.created_at, 
                   s.full_name as sender_name, s.role as sender_role
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            WHERE m.receiver_id = $1
            ORDER BY m.created_at DESC
        `, [req.user.userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching inbox:', error);
        res.status(500).json({ error: 'Server error fetching inbox messages' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { receiver_ids, message_text } = req.body;
        let file_url = null;

        if (req.file) {
            file_url = `/uploads/${req.file.filename}`;
        }

        // Validate receivers
        let receivers = [];
        try {
            receivers = JSON.parse(receiver_ids);
        } catch (e) {
            // handle single id or comma-separated if form data messed up array parsing
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

        res.status(201).json({ message: 'Message(s) sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Server error sending message' });
    }
};
