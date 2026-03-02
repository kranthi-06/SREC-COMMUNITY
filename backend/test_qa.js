require('dotenv').config();
const db = require('./db');

async function test() {
    try {
        // Verify question_analysis table exists
        const tableCheck = await db.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'question_analysis')"
        );
        console.log('question_analysis table exists:', tableCheck.rows[0].exists);

        // Check review_requests
        const rr = await db.query('SELECT id, title FROM review_requests ORDER BY id DESC LIMIT 3');
        console.log('Review requests:', JSON.stringify(rr.rows));

        if (rr.rows.length > 0) {
            const requestId = rr.rows[0].id;
            console.log('\nTesting analytics for request', requestId);

            // Test full analytics query
            const requestCheck = await db.query('SELECT * FROM review_requests WHERE id = $1', [requestId]);
            console.log('Request found:', requestCheck.rows.length > 0 ? 'YES' : 'NO');

            const sentCount = await db.query(
                'SELECT COUNT(*) as count FROM review_request_recipients WHERE request_id = $1',
                [requestId]
            );
            console.log('Recipients:', sentCount.rows[0].count);

            const responses = await db.query(
                'SELECT COUNT(*) as count FROM review_responses WHERE request_id = $1',
                [requestId]
            );
            console.log('Responses:', responses.rows[0].count);

            // The critical query - question_analysis
            const qa = await db.query(
                'SELECT * FROM question_analysis WHERE request_id = $1 ORDER BY created_at ASC',
                [requestId]
            );
            console.log('Question analysis rows:', qa.rows.length);

            console.log('\n✅ All queries successful');
        }

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
test();
