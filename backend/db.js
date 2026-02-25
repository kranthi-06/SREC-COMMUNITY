const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: 'postgres.hntgwmiglqmmofwgeyew',
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'Santhiram@2004',
    port: 6543,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('Connected to Supabase Postgres');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
