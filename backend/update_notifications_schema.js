const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateNotificationsSchema() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            console.log('Creating notifications table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    reference_id VARCHAR(255),
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('Creating indexes for notifications...');
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
            `);

            await client.query('COMMIT');
            console.log('Notifications schema updated successfully!');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating notifications schema:', error);
    } finally {
        await pool.end();
    }
}

updateNotificationsSchema();
