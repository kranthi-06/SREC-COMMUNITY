require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    try {
        await pool.query('ALTER TABLE otp_verifications ALTER COLUMN otp TYPE VARCHAR(255)');
        console.log('✅ Column expanded to VARCHAR(255)');

        // Verify
        const r = await pool.query("SELECT character_maximum_length FROM information_schema.columns WHERE table_name='otp_verifications' AND column_name='otp'");
        console.log('New max length:', r.rows[0]?.character_maximum_length);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await pool.end();
}
fix();
