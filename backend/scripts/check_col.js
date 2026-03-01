require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT character_maximum_length FROM information_schema.columns WHERE table_name='otp_verifications' AND column_name='otp'")
    .then(r => { console.log('OTP column max length:', r.rows[0]?.character_maximum_length); pool.end(); })
    .catch(e => { console.error(e.message); pool.end(); });
