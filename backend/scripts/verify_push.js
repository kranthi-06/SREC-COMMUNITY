require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        // 1. Check VAPID keys
        console.log('=== VAPID KEY CHECK ===');
        console.log('PUBLIC:', process.env.VAPID_PUBLIC_KEY ? 'SET (' + process.env.VAPID_PUBLIC_KEY.length + ' chars)' : 'MISSING');
        console.log('PRIVATE:', process.env.VAPID_PRIVATE_KEY ? 'SET (' + process.env.VAPID_PRIVATE_KEY.length + ' chars)' : 'MISSING');

        // 2. Validate VAPID
        const webPush = require('web-push');
        webPush.setVapidDetails(
            'mailto:support@srecnandyal.edu.in',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        console.log('VAPID: VALID\n');

        // 3. Check push_subscriptions table
        console.log('=== DATABASE CHECK ===');
        const tableCheck = await pool.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'push_subscriptions'"
        );
        if (tableCheck.rows.length === 0) {
            console.log('TABLE: push_subscriptions DOES NOT EXIST - Creating...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    endpoint TEXT NOT NULL UNIQUE,
                    p256dh_key TEXT NOT NULL,
                    auth_key TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('TABLE: push_subscriptions CREATED');
        } else {
            console.log('TABLE: push_subscriptions EXISTS');
            tableCheck.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));
        }

        // 4. Check existing subscriptions
        const subs = await pool.query('SELECT COUNT(*) FROM push_subscriptions');
        console.log('SUBSCRIPTIONS:', subs.rows[0].count);

        // 5. Check notifications table
        const notifCount = await pool.query('SELECT COUNT(*) FROM notifications');
        console.log('NOTIFICATIONS:', notifCount.rows[0].count);

        console.log('\n=== ALL CHECKS PASSED ===');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

main();
