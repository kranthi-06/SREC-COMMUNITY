/**
 * Test Web Push delivery — sends a test push to all subscriptions
 */
require('dotenv').config();
const webPush = require('web-push');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testPush() {
    try {
        // Configure VAPID
        webPush.setVapidDetails(
            'mailto:support@srecnandyal.edu.in',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        console.log('VAPID configured ✓');

        // Get all subscriptions
        const { rows } = await pool.query('SELECT * FROM push_subscriptions');
        console.log(`Found ${rows.length} subscription(s)`);

        const payload = JSON.stringify({
            title: '🔔 CampusPulse Test',
            body: 'Background push notification test! If you see this with app CLOSED, VAPID is working!',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            url: '/',
            type: 'TEST',
            timestamp: Date.now()
        });

        for (const sub of rows) {
            try {
                const result = await webPush.sendNotification(
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
                console.log(`✅ Push sent to subscription ${sub.id} — Status: ${result.statusCode}`);
            } catch (err) {
                console.error(`❌ Push failed for subscription ${sub.id}:`, err.statusCode, err.body);
                if (err.statusCode === 410) {
                    console.log('   → Subscription expired, removing...');
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

testPush();
