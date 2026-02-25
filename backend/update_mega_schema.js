const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function updateSchema() {
    try {
        console.log('Beginning MEGA schema migration...');

        // POSTS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                author_id UUID REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                image_url VARCHAR(255),
                link_url VARCHAR(255),
                pdf_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // POST_LIKES TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_likes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id)
            );
        `);

        // POST_COMMENTS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // POST_SHARES TABLE (Optional tracking)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS post_shares (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // EVENTS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS campus_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                department VARCHAR(100),
                event_date TIMESTAMP NOT NULL,
                status VARCHAR(50) DEFAULT 'upcoming',
                attachment_url VARCHAR(255),
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // REVIEWS ENHANCEMENT (if needed)
        await pool.query(`
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'event';
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_id UUID;
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50);
        `);

        console.log('MEGA Schema migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
