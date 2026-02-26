/**
 * Auth Middleware — Production-Grade
 * ====================================
 * - JWT verification with role mismatch detection
 * - Refresh token support
 * - Role hierarchy enforcement
 * - Auto-logout on role mismatch between token and database
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'srecnandyal_super_secret_key_123';

/**
 * Core authentication middleware.
 * Verifies JWT, checks role mismatch against database for critical operations.
 */
const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Check if token is about to expire (< 30 min remaining) — hint to frontend
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && (decoded.exp - now) < 1800) {
            res.setHeader('X-Token-Expiring', 'true');
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ error: 'Token is not valid' });
    }
};

/**
 * Strict authentication — also verifies role matches database in real-time.
 * Use this for role-change and admin-critical operations.
 */
const protectStrict = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify role matches current database state
        const result = await db.query('SELECT role, is_verified FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User account no longer exists', code: 'ACCOUNT_DELETED' });
        }

        const dbUser = result.rows[0];
        if (!dbUser.is_verified) {
            return res.status(403).json({ error: 'Account is not verified', code: 'NOT_VERIFIED' });
        }

        // Role mismatch detection — force re-login
        if (dbUser.role !== decoded.role) {
            return res.status(403).json({
                error: 'Your role has been updated. Please log in again to refresh your session.',
                code: 'ROLE_MISMATCH',
                newRole: dbUser.role
            });
        }

        req.user = { ...decoded, role: dbUser.role };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ error: 'Token is not valid' });
    }
};

/**
 * Role-based access control middlewares.
 * Each checks the authenticated user's role against allowed roles.
 */
const studentOnly = (req, res, next) => {
    if (req.user && ['student', 'black_hat_admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Students only' });
    }
};

const facultyOnly = (req, res, next) => {
    if (req.user && req.user.role === 'faculty') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Faculty only' });
    }
};

const blackHatOnly = (req, res, next) => {
    if (req.user && req.user.role === 'black_hat_admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Super Admin clearance required' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && ['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Admins only' });
    }
};

const postCreators = (req, res, next) => {
    if (req.user && ['black_hat_admin', 'admin', 'editor_admin', 'faculty'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Students cannot create posts' });
    }
};

/**
 * Generic role checker — accepts an array of allowed roles.
 * Usage: router.get('/endpoint', protect, requireRoles(['admin', 'editor_admin']), handler);
 */
const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (req.user && allowedRoles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({
                error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }
    };
};

module.exports = {
    protect,
    protectStrict,
    studentOnly,
    facultyOnly,
    blackHatOnly,
    adminOnly,
    postCreators,
    requireRoles
};
