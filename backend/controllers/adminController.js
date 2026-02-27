/**
 * Admin Controller — Command Centre Functions
 * =============================================
 * - User listing with filters
 * - Role management (BLACK_HAT only)
 * - User deletion
 * - Audit log viewer
 * All actions are audit-logged.
 */
const db = require('../db');

/**
 * GET /api/admin/users
 * Retrieve all users (excluding black_hat_admin from results).
 * Supports filtering by role, department, batch year.
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { role, department, year } = req.query;
        let query = 'SELECT id, full_name, email, role, department, batch_year, phone_number, is_verified, created_at FROM users WHERE 1=1';
        let values = [];
        let count = 1;

        if (role) {
            query += ` AND role = $${count}`;
            values.push(role);
            count++;
        }
        if (department) {
            query += ` AND department = $${count}`;
            values.push(department);
            count++;
        }
        if (year) {
            query += ` AND (batch_year = $${count} OR left(split_part(email, '@', 1), 2) = $${count})`;
            values.push(year);
            count++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, values);

        // Log admin user view
        await req.audit('VIEW_USERS', null, {
            filters: { role, department, year },
            resultCount: result.rows.length
        });

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error tracking users' });
    }
};

/**
 * PUT /api/admin/role
 * Update a user's role. Only BLACK_HAT_ADMIN can perform this.
 * Cannot promote anyone to black_hat_admin via API.
 */
exports.updateRole = async (req, res) => {
    try {
        const { targetUserId, newRole } = req.body;

        if (!targetUserId || !newRole) {
            return res.status(400).json({ error: 'Target User ID and new role are required.' });
        }

        const validRoles = ['admin', 'editor_admin', 'faculty', 'student'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ error: 'Invalid or restricted role selection.' });
        }

        // Prevent modifying another Black Hat Admin
        const targetCheck = await db.query('SELECT role, full_name, email FROM users WHERE id = $1', [targetUserId]);
        if (targetCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const target = targetCheck.rows[0];
        if (target.role === 'black_hat_admin') {
            return res.status(403).json({ error: 'Cannot modify a Super Admin account.' });
        }

        const oldRole = target.role;
        await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, targetUserId]);

        // Audit: Role Change
        await req.audit('ROLE_CHANGE', targetUserId, {
            targetEmail: target.email,
            targetName: target.full_name,
            oldRole,
            newRole
        });

        res.json({ message: `Role successfully updated to ${newRole.toUpperCase()}` });
    } catch (error) {
        console.error('Error updating roles:', error);
        res.status(500).json({ error: 'Server error modifying user roles' });
    }
};

/**
 * DELETE /api/admin/user/:userId
 * Delete a user account. Only BLACK_HAT_ADMIN can perform this.
 * Cannot delete another BLACK_HAT_ADMIN.
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const targetCheck = await db.query('SELECT role, full_name, email FROM users WHERE id = $1', [userId]);
        if (targetCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const target = targetCheck.rows[0];
        if (target.role === 'black_hat_admin') {
            return res.status(403).json({ error: 'Cannot delete a Super Admin account.' });
        }

        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        // Audit: User Deletion
        await req.audit('USER_DELETE', userId, {
            deletedEmail: target.email,
            deletedName: target.full_name,
            deletedRole: target.role
        });

        res.json({ message: `User ${target.full_name} has been permanently deleted.` });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error deleting user' });
    }
};

/**
 * GET /api/admin/audit-logs
 * View audit logs. Only admins can access.
 * Supports pagination and filtering.
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const { action, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT al.*, u.full_name as actor_name, u.email as actor_email
            FROM audit_logs al
            LEFT JOIN users u ON al.actor_id = u.id
        `;
        let values = [];
        let count = 1;

        if (action) {
            query += ` WHERE al.action = $${count}`;
            values.push(action);
            count++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${count} OFFSET $${count + 1}`;
        values.push(parseInt(limit), offset);

        const result = await db.query(query, values);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM audit_logs';
        if (action) countQuery += ` WHERE action = '${action}'`;
        const totalResult = await db.query(countQuery);

        res.json({
            logs: result.rows,
            total: parseInt(totalResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Server error fetching audit logs' });
    }
};

/**
 * GET /api/admin/stats
 * Get platform statistics for admin dashboard.
 */
exports.getStats = async (req, res) => {
    try {
        const [usersResult, reviewsResult, postsResult, eventsResult] = await Promise.all([
            db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE role = 'student') as students,
                    COUNT(*) FILTER (WHERE role = 'faculty') as faculty,
                    COUNT(*) FILTER (WHERE role IN ('admin', 'editor_admin')) as admins,
                    COUNT(*) as total
                FROM users
            `),
            db.query('SELECT COUNT(*) as total FROM review_requests'),
            db.query('SELECT COUNT(*) as total FROM posts'),
            db.query('SELECT COUNT(*) as total FROM campus_events')
        ]);

        res.json({
            users: usersResult.rows[0],
            reviews: { total: parseInt(reviewsResult.rows[0].total) },
            posts: { total: parseInt(postsResult.rows[0].total) },
            events: { total: parseInt(eventsResult.rows[0].total) }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Server error fetching statistics' });
    }
};
