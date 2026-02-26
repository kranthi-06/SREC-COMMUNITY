/**
 * Schema Migration: Production Hardening
 * ----------------------------------------
 * Adds:
 *  1. audit_logs table — complete action audit trail
 *  2. refresh_tokens table — secure token rotation
 *  3. event_end_date column to campus_events (if missing)
 *  4. event_type column to campus_events (if missing)
 *  5. system_notifications table — auto-generated notifications
 */
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
    try {
        console.log('🔒 Starting Production Hardening Migration...\n');

        // 1. AUDIT LOGS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                target_id UUID,
                metadata JSONB DEFAULT '{}',
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ audit_logs table ready');

        // Index for fast queries by actor and action
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
            CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
        `);
        console.log('✅ audit_logs indexes created');

        // 2. REFRESH TOKENS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_revoked BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ refresh_tokens table ready');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash);
        `);
        console.log('✅ refresh_tokens indexes created');

        // 3. Ensure event_end_date exists on campus_events
        await pool.query(`
            ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMP;
            ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
        `);
        console.log('✅ campus_events extended with event_end_date and event_type');

        // 4. SYSTEM NOTIFICATIONS TABLE
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                body TEXT,
                is_read BOOLEAN DEFAULT false,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ system_notifications table ready');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notif_user ON system_notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notif_read ON system_notifications(is_read);
        `);
        console.log('✅ system_notifications indexes created');

        // 5. Add batch_year column to users if missing
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_year VARCHAR(10);
        `);
        console.log('✅ users.batch_year column ensured');

        console.log('\n🎉 Production Hardening Migration COMPLETE!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
};

runMigration();
