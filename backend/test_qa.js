require('dotenv').config();
const db = require('./db');

async function test() {
    try {
        // Check if question_sentiments column exists
        const cols = await db.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name='imported_responses'"
        );
        console.log('imported_responses columns:', cols.rows.map(r => r.column_name).join(', '));

        // Test the exact query from getDatasetAnalysis
        const dsResult = await db.query('SELECT * FROM imported_datasets WHERE id = $1', ['26ba3ab3-dec4-4047-9c53-2d218b763f03']);
        console.log('Dataset found:', dsResult.rows.length > 0 ? 'YES' : 'NO');
        if (dsResult.rows.length > 0) {
            console.log('Dataset columns:', JSON.stringify(dsResult.rows[0].columns));
        }

        const resp = await db.query(
            'SELECT id, row_index, respondent_name, raw_data, sentiment_label, sentiment_score, ai_confidence, question_sentiments, analyzed_at FROM imported_responses WHERE dataset_id = $1 ORDER BY row_index ASC',
            ['26ba3ab3-dec4-4047-9c53-2d218b763f03']
        );
        console.log('Responses found:', resp.rows.length);
        if (resp.rows.length > 0) {
            console.log('First response keys:', Object.keys(resp.rows[0]).join(', '));
        }

        // Test question_analysis query
        const qa = await db.query(
            'SELECT * FROM question_analysis WHERE dataset_id = $1 ORDER BY created_at ASC',
            ['26ba3ab3-dec4-4047-9c53-2d218b763f03']
        );
        console.log('Question analysis rows:', qa.rows.length);

        console.log('\n✅ All queries passed successfully');
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        console.error('Stack:', e.stack);
        process.exit(1);
    }
}
test();
