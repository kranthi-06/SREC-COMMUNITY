const { query } = require('./db');

async function testJoin() {
    try {
        console.log('Testing JOIN between campus_events and users...');
        const res = await query(`
            SELECT e.id, e.title, u.full_name
            FROM campus_events e
            JOIN users u ON e.creator_id = u.id
            LIMIT 1
        `);
        console.log('Join successful. Rows found:', res.rows.length);
        if (res.rows.length > 0) {
            console.log('First row:', res.rows[0]);
        }
    } catch (err) {
        console.error('Join failed:', err);
    } finally {
        process.exit(0);
    }
}

testJoin();
