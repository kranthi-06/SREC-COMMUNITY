const { Client } = require('pg');

const test = async () => {
    const connectionString = 'postgresql://postgres.hntgwmiglqmofwgeyew:Santhiram%402004@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('SUCCESS: Connected via string');
        const res = await client.query('SELECT NOW()');
        console.log('TIME:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('FAILURE: Connection failed');
        console.error(err.message);
        console.error('Code:', err.code);
    }
};

test();
