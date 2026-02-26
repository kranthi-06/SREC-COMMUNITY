/**
 * Audit Middleware — Logs every mutating action to the audit_logs table.
 * This captures WHO did WHAT to WHOM and WHEN for full accountability.
 */
const db = require('../db');

/**
 * Creates an audit log entry.
 * @param {string} actorId - The user performing the action (UUID)
 * @param {string} action - The action type (e.g., 'ROLE_CHANGE', 'REVIEW_CREATE')
 * @param {string|null} targetId - The target entity ID (UUID) if applicable
 * @param {object} metadata - Additional context about the action
 * @param {string} ipAddress - The request IP address
 */
const createAuditLog = async (actorId, action, targetId, metadata = {}, ipAddress = 'unknown') => {
    try {
        await db.query(`
            INSERT INTO audit_logs (actor_id, action, target_id, metadata, ip_address)
            VALUES ($1, $2, $3, $4, $5)
        `, [actorId, action, targetId, JSON.stringify(metadata), ipAddress]);
    } catch (error) {
        // Audit logging should NEVER crash the main request flow
        console.error('AUDIT_LOG_ERROR (non-blocking):', error.message);
    }
};

/**
 * Express middleware that attaches audit logging to the request object.
 * Usage in controllers: await req.audit('ACTION_NAME', targetId, { key: 'value' });
 */
const attachAudit = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    
    req.audit = async (action, targetId = null, metadata = {}) => {
        const actorId = req.user?.userId || null;
        await createAuditLog(actorId, action, targetId, {
            ...metadata,
            method: req.method,
            path: req.originalUrl,
            userAgent: req.headers['user-agent']?.substring(0, 200) || 'unknown'
        }, ip);
    };
    
    next();
};

module.exports = { createAuditLog, attachAudit };
