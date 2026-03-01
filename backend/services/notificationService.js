const { query } = require('../db');
const systemEmitter = require('../utils/eventEmitter');
const socket = require('../socket');

/**
 * Helper to fetch user IDs based on department and batch_year
 */
async function getTargetUsers(department, batch_year) {
    let q = 'SELECT id FROM users WHERE 1=1';
    let values = [];
    if (department) {
        values.push(department);
        q += ` AND department = $${values.length}`;
    }
    if (batch_year) {
        values.push(batch_year);
        q += ` AND batch_year = $${values.length}`;
    }
    try {
        const { rows } = await query(q, values);
        return rows.map(r => r.id);
    } catch (err) {
        console.error('Error fetching target users for notification:', err);
        return [];
    }
}

/**
 * Helper to fetch all users (for global notifications)
 */
async function getAllUsers() {
    try {
        const { rows } = await query('SELECT id FROM users');
        return rows.map(r => r.id);
    } catch (err) {
        console.error('Error fetching all users for notification:', err);
        return [];
    }
}

/**
 * Process sending a notification to a list of users
 */
async function sendNotification(userIds, title, message, type, referenceId) {
    if (!userIds || userIds.length === 0) return;

    // Filter duplicates
    const uniqueUsers = [...new Set(userIds)];

    // Save to DB
    const insertQuery = `
        INSERT INTO notifications (user_id, title, message, type, reference_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    // Process async in background
    setTimeout(async () => {
        for (const userId of uniqueUsers) {
            try {
                // Determine reference_id string
                let refIdStr = referenceId ? String(referenceId) : null;
                const { rows } = await query(insertQuery, [userId, title, message, type, refIdStr]);
                const newNotif = rows[0];

                // Emit via socket if online
                const io = socket.getIo();
                if (io) {
                    const socketId = socket.getConnectedUserSocket(userId);
                    if (socketId) {
                        io.to(socketId).emit('new_notification', newNotif);
                    }
                }
            } catch (err) {
                console.error(`Failed to send notification to user ${userId}:`, err.message);
            }
        }
    }, 0);
}

// ============================================
// EVENT LISTENERS
// ============================================

systemEmitter.on('MESSAGE_SENT', async (payload) => {
    // payload: { senderRole, recipientIds, messageContent, referenceId }
    try {
        console.log('[NotificationService] Processing MESSAGE_SENT');
        const title = `You received a message from ${payload.senderRole}`;
        const usersToNotify = payload.recipientIds || [];
        await sendNotification(usersToNotify, title, payload.messageContent, 'MESSAGE', payload.referenceId);
    } catch (err) {
        console.error('Error handling MESSAGE_SENT event:', err);
    }
});

systemEmitter.on('REVIEW_REQUEST_SENT', async (payload) => {
    // payload: { senderRole, studentIds, referenceId, eventName }
    try {
        console.log('[NotificationService] Processing REVIEW_REQUEST_SENT');
        const title = `New Review Request from ${payload.senderRole}`;
        const message = `You have been requested to review: ${payload.eventName}`;
        const usersToNotify = payload.studentIds || [];
        await sendNotification(usersToNotify, title, message, 'REVIEW', payload.referenceId);
    } catch (err) {
        console.error('Error handling REVIEW_REQUEST_SENT event:', err);
    }
});

systemEmitter.on('EVENT_CREATED', async (payload) => {
    // payload: { title, type, department, batch_year, referenceId }
    try {
        console.log('[NotificationService] Processing EVENT_CREATED');
        const title = `New Event Added: ${payload.title}`;
        const message = `Check out the new campus event! Type: ${payload.type}`;

        let usersToNotify = [];
        if (payload.department || payload.batch_year) {
            usersToNotify = await getTargetUsers(payload.department, payload.batch_year);
        } else {
            usersToNotify = await getAllUsers();
        }
        await sendNotification(usersToNotify, title, message, 'EVENT', payload.referenceId);
    } catch (err) {
        console.error('Error handling EVENT_CREATED event:', err);
    }
});

systemEmitter.on('POST_CREATED', async (payload) => {
    // payload: { authorRole, postId }
    try {
        console.log('[NotificationService] Processing POST_CREATED');
        const title = `New Post from ${payload.authorRole}`;
        const message = `A new community post has been published. Check it out!`;
        const usersToNotify = await getAllUsers();
        await sendNotification(usersToNotify, title, message, 'POST', payload.postId);
    } catch (err) {
        console.error('Error handling POST_CREATED event:', err);
    }
});

module.exports = {
    sendNotification, // Exported mainly for testing or explicit calls if needed
};
