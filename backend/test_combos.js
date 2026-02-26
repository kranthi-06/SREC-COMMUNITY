const { Client } = require('pg');

const combinations = [
    { user: 'postgres.hntgwmiglqmofwgeyew', host: 'aws-1-ap-northeast-1.pooler.supabase.com', port: 6543 },
    { user: 'hntgwmiglqmofwgeyew.postgres', host: 'aws-1-ap-northeast-1.pooler.supabase.com', port: 6543 },
    { user: 'postgres', host: 'aws-1-ap-northeast-1.pooler.supabase.com', port: 6543 },
];

const test = async () => {
    for (const config of combinations) {
        console.log(`\nTesting: User=${config.user}, Host=${config.host}:${config.port}`);
        const client = new Client({
            ...config,
            database: 'postgres',
            password: 'Santhiram@2004',
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });
        try {
            await client.connect();
            console.log('SUCCESS!');
            await client.end();
            return;
        } catch (err) {
            console.log(`FAILED: ${err.message}`);
        }
    }
};

test();
