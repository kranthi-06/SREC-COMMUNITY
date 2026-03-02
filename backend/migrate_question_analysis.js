/**
 * Migration: Create question_analysis table
 * ==========================================
 * Stores per-question AI analysis results for both
 * dispatched review forms and imported datasets.
 */
require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log('Creating question_analysis table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS question_analysis (
                id SERIAL PRIMARY KEY,
                request_id INTEGER,
                dataset_id INTEGER,
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

        console.log('✅ question_analysis table created successfully');

        // Create index for fast lookups
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_qa_request_id ON question_analysis(request_id);
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_qa_dataset_id ON question_analysis(dataset_id);
        `);

        console.log('✅ Indexes created');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
