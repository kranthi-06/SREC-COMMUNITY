const db = require('../db');

exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, full_name, email, role, department, phone_number, is_verified, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        let userProfile = result.rows[0];

        // Enhance with role-specific derived fields
        if (userProfile.role === 'student') {
            const emailPrefix = userProfile.email.split('@')[0];
            userProfile.roll_number = emailPrefix.toUpperCase();
            userProfile.batch = emailPrefix.substring(0, 2); // E.g., '23' from 23x51a3324
        } else if (['faculty', 'hod', 'principal'].includes(userProfile.role)) {
            userProfile.designation = userProfile.role.toUpperCase();
        }

        res.json(userProfile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { full_name, phone_number } = req.body;

        if (!full_name || full_name.trim() === '') {
            return res.status(400).json({ error: 'Full name is required' });
        }

        await db.query(
            'UPDATE users SET full_name = $1, phone_number = $2 WHERE id = $3',
            [full_name, phone_number || null, req.user.userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
};
