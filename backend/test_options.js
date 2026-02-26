const { Client } = require('pg');

const test = async () => {
    const connectionString = 'postgresql://postgres:Santhiram%402004@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?options=project%3Dhntgwmiglqmofwgeyew';
    console.log('Testing with options=project parameter...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('SUCCESS!');
        await client.end();
    } catch (err) {
        console.log(`FAILED: ${err.message}`);
    }
};

test();
