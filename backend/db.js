const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pool;

const getPool = () => {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres.hntgwmiglqmmofwgeyew:Santhiram%402004@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
            ssl: {
                rejectUnauthorized: false
            },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });
    }
    return pool;
};

module.exports = {
    query: (text, params) => getPool().query(text, params),
    pool: getPool()
};
