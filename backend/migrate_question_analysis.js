require('dotenv').config();
const db = require('./db');

async function fix() {
    try {
        console.log('Dropping old question_analysis table...');
        await db.query('DROP TABLE IF EXISTS question_analysis');

        console.log('Creating question_analysis with correct column types...');
        await db.query(`
            CREATE TABLE question_analysis (
                id SERIAL PRIMARY KEY,
                request_id UUID,
                dataset_id UUID,
                question_id VARCHAR(255),
                question_text TEXT NOT NULL,
                question_type VARCHAR(50) DEFAULT 'text',
                total_responses INTEGER DEFAULT 0,
                positive_count INTEGER DEFAULT 0,
                neutral_count INTEGER DEFAULT 0,
                negative_count INTEGER DEFAULT 0,
                keywords_json JSONB DEFAULT '[]'::jsonb,
                themes_json JSONB DEFAULT '[]'::jsonb,
                complaints_json JSONB DEFAULT '[]'::jsonb,
                suggestions_json JSONB DEFAULT '[]'::jsonb,
                rating_average DECIMAL(3,2),
                rating_distribution_json JSONB DEFAULT '{}'::jsonb,
                ai_model VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query('CREATE INDEX IF NOT EXISTS idx_qa_request_id ON question_analysis(request_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_qa_dataset_id ON question_analysis(dataset_id)');
        await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_unique_request ON question_analysis(request_id, question_id) WHERE request_id IS NOT NULL');
        await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_unique_dataset ON question_analysis(dataset_id, question_id) WHERE dataset_id IS NOT NULL');

        console.log('✅ question_analysis table recreated with UUID for both request_id AND dataset_id');

        // Verify
        const cols = await db.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='question_analysis' ORDER BY ordinal_position"
        );
        cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
fix();
