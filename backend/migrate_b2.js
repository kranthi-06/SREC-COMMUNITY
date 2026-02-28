/**
 * Migration: Add file_size column to posts table for B2 storage tracking.
 */
const db = require('./db');

async function migrate() {
    try {
        console.log('Adding file_size column to posts table...');
        await db.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;');
        console.log('✅ file_size column added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
