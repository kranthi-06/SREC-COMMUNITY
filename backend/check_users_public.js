const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const columnsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'`);
        console.log(`Columns for public.users:`, columnsRes.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
