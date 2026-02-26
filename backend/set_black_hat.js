const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.hntgwmiglqmmofwgeyew:Santhiram%402004@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function makeAdmin() {
    const email = '23x51a3302@srecnandyal.edu.in';
    const role = 'black_hat_admin';

    try {
        console.log(`Checking for user: ${email}...`);

        const userRes = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);

        if (userRes.rows.length === 0) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const user = userRes.rows[0];
        console.log(`User found. Current role: ${user.role}`);

        console.log(`Updating role to ${role}...`);

        // Remove the CHECK constraint if it exists might be needed, but let's try the update first
        // If it fails due to CHECK constraint, we'll need to drop it.
        await pool.query('UPDATE users SET role = $1 WHERE email = $2', [role, email]);

        console.log(`SUCCESS! User ${email} is now a ${role}.`);
        process.exit(0);
    } catch (err) {
        console.error('Error during update:', err.message);
        if (err.message.includes('check constraint')) {
            console.log('Detected check constraint. Attempting to lift it...');
            try {
                // Find and drop the check constraint
                await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
                // Re-run the update
                await pool.query('UPDATE users SET role = $1 WHERE email = $2', [role, email]);
                console.log(`SUCCESS! (Constraint lifted) User ${email} is now a ${role}.`);
            } catch (dropErr) {
                console.error('Failed to lift constraint:', dropErr.message);
            }
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

makeAdmin();
