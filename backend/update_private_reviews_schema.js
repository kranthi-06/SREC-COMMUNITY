const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const updateSchema = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS review_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
                question TEXT NOT NULL,
                review_type VARCHAR(50) NOT NULL,
                options JSONB,
                filters JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS review_request_recipients (
                request_id UUID REFERENCES review_requests(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                is_answered BOOLEAN DEFAULT false,
                PRIMARY KEY (request_id, student_id)
            );

            CREATE TABLE IF NOT EXISTS review_responses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                request_id UUID REFERENCES review_requests(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                department VARCHAR(50),
                year_string VARCHAR(10),
                selected_option TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(request_id, student_id)
            );
        `);
        console.log('Private Reviews Schema created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
};

updateSchema();
