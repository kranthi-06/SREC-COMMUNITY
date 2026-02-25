const { Client } = require('pg');

const test = async () => {
    const config = {
        user: 'postgres.hntgwmiglqmofwgeyew',
        host: 'aws-0-ap-northeast-1.pooler.supabase.com',
        database: 'postgres',
        password: 'Santhiram@2004',
        port: 6543,
        ssl: { rejectUnauthorized: false }
    };
    console.log(`Testing aws-0 pooler...`);
    const client = new Client(config);
    try {
        await client.connect();
        console.log('SUCCESS!');
        await client.end();
    } catch (err) {
        console.log(`FAILED: ${err.message}`);
    }
};

test();
