require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        // Check otp_verifications table
        const cols = await pool.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'otp_verifications' ORDER BY ordinal_position"
        );
        console.log('=== otp_verifications table ===');
        if (cols.rows.length === 0) {
            console.log('TABLE DOES NOT EXIST!');
        } else {
            cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
        }

        // Check if there are any OTP records
        const otps = await pool.query('SELECT id, email, otp, expires_at FROM otp_verifications LIMIT 5');
        console.log('\nRecent OTP records:', otps.rows.length);
        otps.rows.forEach(r => console.log(JSON.stringify({
            id: r.id,
            email: r.email,
            otp_len: r.otp?.length,
            expired: new Date() > new Date(r.expires_at)
        })));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
