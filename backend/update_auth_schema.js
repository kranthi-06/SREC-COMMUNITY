const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
    try {
        console.log('Beginning schema migration...');
        
        // 1. Add new columns to users
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;');
        console.log('Added new columns to users.');

        // 2. Add OTP verifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created otp_verifications table.');

        // 3. Migrate user IDs from INT to UUID
        const res = await pool.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'`);
        if (res.rows.length > 0 && res.rows[0].data_type === 'integer') {
            console.log('Migrating IDs to UUID...');
            await pool.query('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;');
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();');
            await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS new_user_id UUID;');
            await pool.query('UPDATE reviews SET new_user_id = users.new_id FROM users WHERE reviews.user_id = users.id;');
            await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;');
            await pool.query('ALTER TABLE users DROP COLUMN id;');
            await pool.query('ALTER TABLE users RENAME COLUMN new_id TO id;');
            await pool.query('ALTER TABLE users ADD PRIMARY KEY (id);');
            await pool.query('ALTER TABLE reviews DROP COLUMN user_id;');
            await pool.query('ALTER TABLE reviews RENAME COLUMN new_user_id TO user_id;');
            await pool.query('ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;');
            console.log('UUID migration complete.');
        } else {
            console.log('ID is already a UUID or column not found.');
        }

        // Set is_verified to true for existing users to prevent lockout
        await pool.query('UPDATE users SET is_verified = TRUE WHERE is_verified IS FALSE;');
        
        // Update user roles column definition if necessary
        await pool.query('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);');
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);

        console.log('Schema migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
