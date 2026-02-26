const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const columnsRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campus_events' AND table_schema = 'public'`);
        console.log(`Columns for campus_events:`, columnsRes.rows);

        const usersIdRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'id'`);
        console.log(`Column info for users.id:`, usersIdRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
