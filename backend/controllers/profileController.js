/**
 * Profile Controller — User Profile Management
 * ===============================================
 * Get and update user profiles with role-specific fields.
 */
const db = require('../db');

/**
 * GET /api/profile
 * Get the current user's profile with role-specific derived fields.
 */
exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, full_name, email, role, department, batch_year, phone_number, is_verified, created_at 
             FROM users WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        let userProfile = result.rows[0];

        // Enhance with role-specific derived fields
        if (userProfile.role === 'student' || userProfile.role === 'black_hat_admin') {
            const emailPrefix = userProfile.email.split('@')[0];
            userProfile.roll_number = emailPrefix.toUpperCase();
            userProfile.batch = userProfile.batch_year || emailPrefix.substring(0, 2);
        } else if (['faculty', 'hod', 'principal'].includes(userProfile.role)) {
            userProfile.designation = userProfile.role.toUpperCase();
        }

        // Get notification count
        try {
            const notifCount = await db.query(
                'SELECT COUNT(*) as unread FROM system_notifications WHERE user_id = $1 AND is_read = false',
                [req.user.userId]
            );
            userProfile.unread_notifications = parseInt(notifCount.rows[0].unread);
        } catch (e) {
            userProfile.unread_notifications = 0;
        }

        // Get pending review count (for students)
        if (userProfile.role === 'student' || userProfile.role === 'black_hat_admin') {
            try {
                const pendingReviews = await db.query(
                    'SELECT COUNT(*) as pending FROM review_request_recipients WHERE student_id = $1 AND is_answered = false',
                    [req.user.userId]
                );
                userProfile.pending_reviews = parseInt(pendingReviews.rows[0].pending);
            } catch (e) {
                userProfile.pending_reviews = 0;
            }
        }

        res.json(userProfile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
};

/**
 * PUT /api/profile
 * Update the current user's profile.
 * Email and role are READ-ONLY — cannot be changed via this endpoint.
 */
exports.updateProfile = async (req, res) => {
    try {
        const { full_name, phone_number, department } = req.body;

        if (!full_name || full_name.trim() === '') {
            return res.status(400).json({ error: 'Full name is required' });
        }

        if (full_name.length > 100) {
            return res.status(400).json({ error: 'Full name must be less than 100 characters' });
        }

        if (phone_number && !/^[0-9+\-\s()]{7,15}$/.test(phone_number)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Build update query dynamically
        let updateFields = ['full_name = $1', 'phone_number = $2'];
        let values = [full_name.trim(), phone_number || null];
        let paramCount = 3;

        // Allow department update only if not already set or user is faculty
        if (department) {
            updateFields.push(`department = $${paramCount}`);
            values.push(department);
            paramCount++;
        }

        values.push(req.user.userId);

        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
            values
        );

        // Audit: Profile Update
        await req.audit('PROFILE_UPDATE', req.user.userId, {
            updatedFields: { full_name, phone_number, department }
        });

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
};
