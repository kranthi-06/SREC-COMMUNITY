const db = require('./db');
async function run() {
    try {
        // Create imported_datasets table
        await db.query(`
            CREATE TABLE IF NOT EXISTS imported_datasets (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                admin_id UUID REFERENCES users(id),
                title TEXT NOT NULL,
                source_type VARCHAR(20) NOT NULL DEFAULT 'csv',
                source_url TEXT,
                columns JSONB NOT NULL DEFAULT '[]',
                total_rows INTEGER DEFAULT 0,
                analyzed_rows INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'processing',
                ai_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created imported_datasets table');

        // Create imported_responses table  
        await db.query(`
            CREATE TABLE IF NOT EXISTS imported_responses (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                dataset_id UUID REFERENCES imported_datasets(id) ON DELETE CASCADE,
                row_index INTEGER NOT NULL,
                respondent_name VARCHAR(255),
                raw_data JSONB NOT NULL DEFAULT '{}',
                sentiment_label VARCHAR(20),
                sentiment_score DOUBLE PRECISION,
                ai_confidence DOUBLE PRECISION,
                question_sentiments JSONB DEFAULT '{}',
                analyzed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created imported_responses table');

        // Create index for faster lookups
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_imported_responses_dataset ON imported_responses(dataset_id)
        `);
        console.log('Created indexes');

        console.log('Migration complete!');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}
run();
