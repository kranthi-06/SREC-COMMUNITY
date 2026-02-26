const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const updateSchema = async () => {
    try {
        await pool.query(`
            DROP TABLE IF EXISTS review_responses CASCADE;
            DROP TABLE IF EXISTS review_request_recipients CASCADE;
            DROP TABLE IF EXISTS review_requests CASCADE;

            CREATE TABLE IF NOT EXISTS review_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                questions JSONB NOT NULL,
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
                answers JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(request_id, student_id)
            );
        `);
        console.log('Private Reviews Schema V2 created successfully. (Google Forms style)');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
};

updateSchema();
