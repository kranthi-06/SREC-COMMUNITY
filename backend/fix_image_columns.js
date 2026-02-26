const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixColumns() {
    try {
        console.log('Starting column type fix...');

        // Fix campus_events table
        console.log('Updating campus_events.attachment_url to TEXT...');
        await pool.query('ALTER TABLE campus_events ALTER COLUMN attachment_url TYPE TEXT');

        // Fix posts table
        console.log('Updating posts.image_url to TEXT...');
        await pool.query('ALTER TABLE posts ALTER COLUMN image_url TYPE TEXT');

        console.log('Updating posts.pdf_url to TEXT...');
        await pool.query('ALTER TABLE posts ALTER COLUMN pdf_url TYPE TEXT');

        console.log('Column type fix completed successfully.');
    } catch (err) {
        console.error('Error fixing columns:', err);
    } finally {
        await pool.end();
    }
}

fixColumns();
