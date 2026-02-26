const { query } = require('./db');

const test = async () => {
    try {
        console.log('Testing connection with object config...');
        const res = await query('SELECT NOW()');
        console.log('SUCCESS! Current database time:', res.rows[0].now);
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Connection failed');
        console.error(err);
        process.exit(1);
    }
};

test();
