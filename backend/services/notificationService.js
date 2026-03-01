/**
 * CampusPulse — Backend Notification Service (Production Grade)
 * =============================================================
 * Event-driven notification delivery engine.
 * Handles: DB persistence, WebSocket relay, VAPID Web Push delivery.
 * 
 * Architectural Rules:
 * - Core modules emit events; this service subscribes.
 * - Push delivery is async and non-blocking.
 * - Expired subscriptions are auto-cleaned.
 * - Rate limiting prevents duplicate rapid notifications.
 * - Never crashes the main request flow.
 */
const { query } = require('../db');
const systemEmitter = require('../utils/eventEmitter');
const socket = require('../socket');
const webPush = require('web-push');

// ─── VAPID CONFIGURATION ──────────────────────────────────
let vapidConfigured = false;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
        webPush.setVapidDetails(
            'mailto:support@srecnandyal.edu.in',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        vapidConfigured = true;
        console.log('[NotificationService] VAPID Web Push configured ✓');
    } catch (err) {
        console.error('[NotificationService] VAPID configuration failed:', err.message);
    }
} else {
    console.warn('[NotificationService] VAPID keys not found — Web Push disabled');
}

// ─── RATE LIMITING (in-memory dedup) ───────────────────────
const recentPushes = new Map(); // key: `${userId}-${type}` → timestamp
const PUSH_COOLDOWN_MS = 5000; // 5 seconds between same-type pushes per user

function isDuplicatePush(userId, type) {
    const key = `${userId}-${type}`;
    const last = recentPushes.get(key);
    const now = Date.now();
    if (last && (now - last) < PUSH_COOLDOWN_MS) return true;
    recentPushes.set(key, now);
    // Cleanup old entries periodically
    if (recentPushes.size > 10000) {
        for (const [k, v] of recentPushes) {
            if (now - v > 60000) recentPushes.delete(k);
        }
    }
    return false;
}

// ─── HELPER: Fetch Target Users ───────────────────────────
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
        console.error('[NotificationService] Error fetching target users:', err.message);
        return [];
    }
}

async function getAllUsers() {
    try {
        const { rows } = await query('SELECT id FROM users');
        return rows.map(r => r.id);
    } catch (err) {
        console.error('[NotificationService] Error fetching all users:', err.message);
        return [];
    }
}

// ─── CORE: Send Notification ──────────────────────────────
async function sendNotification(userIds, title, message, type, referenceId) {
    if (!userIds || userIds.length === 0) return;

    const uniqueUsers = [...new Set(userIds)];
    const timestamp = Date.now();

    const insertQuery = `
        INSERT INTO notifications (user_id, title, message, type, reference_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    // Async non-blocking processing
    setImmediate(async () => {
        for (const userId of uniqueUsers) {
            try {
                // 1. Save to database
                const refIdStr = referenceId ? String(referenceId) : null;
                const { rows } = await query(insertQuery, [userId, title, message, type, refIdStr]);
                const newNotif = rows[0];

                // 2. WebSocket relay (for live in-app UI updates)
                try {
                    const io = socket.getIo();
                    if (io) {
                        const socketId = socket.getConnectedUserSocket(userId);
                        if (socketId) {
                            io.to(socketId).emit('new_notification', newNotif);
                        }
                    }
                } catch (socketErr) {
                    // WebSocket failure should never block notification flow
                }

                // 3. Web Push Delivery (VAPID)
                if (vapidConfigured && !isDuplicatePush(userId, type)) {
                    try {
                        const pushSubs = await query(
                            'SELECT id, endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
                            [userId]
                        );

                        if (pushSubs.rows.length > 0) {
                            const payload = JSON.stringify({
                                title,
                                body: message,
                                icon: '/icons/icon-192.png',
                                badge: '/icons/icon-192.png',
                                url: '/',
                                type,
                                timestamp
                            });

                            const pushPromises = pushSubs.rows.map(async (sub) => {
                                try {
                                    await webPush.sendNotification(
                                        {
                                            endpoint: sub.endpoint,
                                            keys: {
                                                p256dh: sub.p256dh_key,
                                                auth: sub.auth_key
                                            }
                                        },
                                        payload,
                                        { TTL: 86400, urgency: 'high' }
                                    );
                                } catch (pushErr) {
                                    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                                        // Expired/invalid subscription — clean up
                                        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                                        console.log(`[WebPush] Cleaned expired subscription ${sub.id}`);
                                    } else if (pushErr.statusCode === 429) {
                                        console.warn(`[WebPush] Rate limited for endpoint ${sub.endpoint.substring(0, 50)}...`);
                                    } else {
                                        console.error(`[WebPush] Delivery failed:`, pushErr.statusCode || pushErr.message);
                                    }
                                }
                            });

                            await Promise.allSettled(pushPromises);
                        }
                    } catch (pushQueryErr) {
                        console.error('[WebPush] DB query failed:', pushQueryErr.message);
                    }
                }
            } catch (err) {
                console.error(`[NotificationService] Failed for user ${userId}:`, err.message);
            }
        }
    });
}

// ─── EVENT LISTENERS ──────────────────────────────────────

systemEmitter.on('MESSAGE_SENT', async (payload) => {
    try {
        console.log('[NotificationService] Processing MESSAGE_SENT');
        const title = `You received a message from ${payload.senderRole}`;
        const usersToNotify = payload.recipientIds || [];
        await sendNotification(usersToNotify, title, payload.messageContent, 'MESSAGE', payload.referenceId);
    } catch (err) {
        console.error('[NotificationService] MESSAGE_SENT error:', err.message);
    }
});

systemEmitter.on('REVIEW_REQUEST_SENT', async (payload) => {
    try {
        console.log('[NotificationService] Processing REVIEW_REQUEST_SENT');
        const title = `New Review Request from ${payload.senderRole}`;
        const message = `You have been requested to review: ${payload.eventName}`;
        const usersToNotify = payload.studentIds || [];
        await sendNotification(usersToNotify, title, message, 'REVIEW', payload.referenceId);
    } catch (err) {
        console.error('[NotificationService] REVIEW_REQUEST_SENT error:', err.message);
    }
});

systemEmitter.on('EVENT_CREATED', async (payload) => {
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
        console.error('[NotificationService] EVENT_CREATED error:', err.message);
    }
});

systemEmitter.on('POST_CREATED', async (payload) => {
    try {
        console.log('[NotificationService] Processing POST_CREATED');
        const title = `New Post from ${payload.authorRole}`;
        const message = `A new community post has been published. Check it out!`;
        const usersToNotify = await getAllUsers();
        await sendNotification(usersToNotify, title, message, 'POST', payload.postId);
    } catch (err) {
        console.error('[NotificationService] POST_CREATED error:', err.message);
    }
});

module.exports = { sendNotification };
