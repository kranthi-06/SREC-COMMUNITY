const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log('Tables:', tables);

        for (const table of tables) {
            const columnsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            console.log(`Columns for ${table}:`, columnsRes.rows.map(r => r.column_name));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
