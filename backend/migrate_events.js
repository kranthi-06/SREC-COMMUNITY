const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add event_end_date and event_type
        await pool.query(`
            ALTER TABLE campus_events 
            ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
        `);
        console.log('Added event_end_date and event_type columns.');

        // Update existing events: set event_type to current category and set end_date to start_date + 2 hours as default
        await pool.query(`
            UPDATE campus_events 
            SET event_type = category,
                event_end_date = event_date + interval '2 hours'
            WHERE event_type IS NULL;
        `);
        console.log('Initialized event_type and event_end_date for existing events.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
