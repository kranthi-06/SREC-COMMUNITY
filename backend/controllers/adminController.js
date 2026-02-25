const db = require('../db');

exports.getAllUsers = async (req, res) => {
    try {
        const { role, department, year } = req.query;
        let query = 'SELECT id, full_name, email, role, department, is_verified, created_at FROM users WHERE role != \'black_hat_admin\'';
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
            query += ` AND left(split_part(email, '@', 1), 2) = $${count}`;
            values.push(year);
            count++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error tracking users' });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { targetUserId, newRole } = req.body;

        if (!targetUserId || !newRole) {
            return res.status(400).json({ error: 'Target User ID and new role are required.' });
        }

        const validRoles = ['admin', 'editor_admin', 'faculty', 'student'];
        // Cannot assign black_hat_admin via API. Period.
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ error: 'Invalid or restricted role selection.' });
        }

        // Prevent modifying another Black Hat Admin
        const targetCheck = await db.query('SELECT role FROM users WHERE id = $1', [targetUserId]);
        if (targetCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        if (targetCheck.rows[0].role === 'black_hat_admin') {
            return res.status(403).json({ error: 'Cannot modify a Super Admin account.' });
        }

        await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, targetUserId]);
        res.json({ message: `Role successfully updated to ${newRole.toUpperCase()}` });
    } catch (error) {
        console.error('Error updating roles:', error);
        res.status(500).json({ error: 'Server error modifying user roles' });
    }
};
