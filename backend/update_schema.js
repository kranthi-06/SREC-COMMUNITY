const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function updateSchema() {
    try {
        console.log('Adding event_date and event_time columns...');
        await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date DATE");
        await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME");
        console.log('Columns added successfully.');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

updateSchema();
