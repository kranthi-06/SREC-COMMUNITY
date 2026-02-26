/**
 * Auth Controller — Authentication & OTP Verification
 * =====================================================
 * Handles registration, OTP verification, login, and token refresh.
 * All auth actions are audit-logged.
 */
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOTP } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'srecnandyal_super_secret_key_123';
const TOKEN_EXPIRY = '12h';

/**
 * Detect role and department from email pattern.
 * BLACK_HAT_ADMIN emails are hardcoded and IMMUTABLE.
 */
const detectRoleAndDepartment = (email) => {
    email = email.toLowerCase().trim();

    // SUPER ADMIN FORCE OVERRIDE — NEVER modifiable
    const BLACK_HAT_EMAILS = [
        '23x51a3324@srecnandyal.edu.in',
        '23x51a3365@srecnandyal.edu.in',
        '23x51a3325@srecnandyal.edu.in'
    ];

    if (BLACK_HAT_EMAILS.includes(email)) {
        return { role: 'black_hat_admin', department: null };
    }

    if (/^principal@srecnandyal\.edu\.in$/.test(email)) {
        return { role: 'faculty', department: null };
    }

    const hodMatch = email.match(/^hod\.([a-z]+)@srecnandyal\.edu\.in$/);
    if (hodMatch) {
        return { role: 'faculty', department: hodMatch[1] };
    }

    if (/^[a-z]+\.[a-z]+@srecnandyal\.edu\.in$/.test(email)) {
        return { role: 'faculty', department: null };
    }

    if (/^[a-z0-9]+@srecnandyal\.edu\.in$/.test(email)) {
        return { role: 'student', department: null };
    }

    return null;
};

/**
 * Validate that the login/register route type matches detected role.
 */
const validateRouteAndRole = (routeType, detectedRole) => {
    if (detectedRole === 'black_hat_admin') return true;
    if (routeType === 'student' && detectedRole !== 'student') return false;
    if (routeType === 'faculty' && !['faculty', 'admin', 'editor_admin'].includes(detectedRole)) return false;
    return true;
};

/**
 * Generate a signed JWT access token.
 */
const generateToken = (user) => {
    return jwt.sign(
        { userId: user.id, email: user.email, role: user.role, department: user.department },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

/**
 * Generate a secure refresh token and store its hash.
 */
const generateRefreshToken = async (userId) => {
    const token = crypto.randomBytes(40).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Revoke all existing refresh tokens for this user (single active session)
    await db.query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [userId]);

    await db.query(`
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
    `, [userId, hash, expiresAt]);

    return token;
};

/**
 * POST /api/auth/:routeType/register
 * Register a new user with email pattern validation and OTP.
 */
exports.register = async (req, res) => {
    try {
        const { routeType } = req.params;
        const { fullName, email, password, confirmPassword, department, batchYear, phoneNumber, role: requestedRole } = req.body;

        if (!['student', 'faculty'].includes(routeType)) {
            return res.status(400).json({ error: 'Invalid route type.' });
        }

        if (!fullName || !email || !password || !confirmPassword || !department) {
            return res.status(400).json({ error: 'All required fields are required.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const detected = detectRoleAndDepartment(normalizedEmail);

        if (!detected) {
            return res.status(400).json({ error: 'Invalid SREC email pattern.' });
        }

        let finalRole = (detected.role === 'black_hat_admin' || detected.role === 'admin')
            ? detected.role
            : (requestedRole || detected.role);

        let finalDept = department || detected.department;

        if (!validateRouteAndRole(routeType, finalRole)) {
            return res.status(403).json({ error: `Cannot register as ${routeType} with a ${finalRole} email.` });
        }

        // Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        if (userCheck.rows.length > 0) {
            const existingUser = userCheck.rows[0];
            if (existingUser.is_verified) {
                return res.status(400).json({ error: 'User already exists and is verified. Please log in.' });
            }
            await db.query('DELETE FROM users WHERE id = $1', [existingUser.id]);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await db.query(`
            INSERT INTO users (full_name, email, password, role, department, batch_year, phone_number, is_verified) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
        `, [fullName, normalizedEmail, hashedPassword, finalRole, finalDept, batchYear, phoneNumber]);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins

        await db.query('DELETE FROM otp_verifications WHERE email = $1', [normalizedEmail]);
        await db.query(`
            INSERT INTO otp_verifications (email, otp, expires_at) 
            VALUES ($1, $2, $3)
        `, [normalizedEmail, otp, expiresAt]);

        console.log(`\n=========================================\n🚨 DEV SIMULATION: Generated OTP for ${normalizedEmail}: ${otp}\n=========================================\n`);

        const mailSent = await sendOTP(normalizedEmail, otp);

        if (!mailSent) {
            console.log('⚠️ Note: Email dispatch failed. Proceeding with console OTP for testing.');
        }

        // Audit: Registration
        await req.audit('USER_REGISTER', null, {
            email: normalizedEmail,
            role: finalRole,
            department: finalDept,
            routeType
        });

        res.status(201).json({ message: 'Registration initiated. Please check your email (or terminal console) for the OTP.' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
};

/**
 * POST /api/auth/:routeType/verify-otp
 * Verify OTP and complete registration.
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { routeType } = req.params;
        const { email, otp } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!['student', 'faculty'].includes(routeType)) {
            return res.status(400).json({ error: 'Invalid route type.' });
        }

        if (!normalizedEmail || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const detected = detectRoleAndDepartment(normalizedEmail);
        if (!detected || !validateRouteAndRole(routeType, detected.role)) {
            return res.status(403).json({ error: 'Role mismatch.' });
        }

        const result = await db.query(`
            SELECT * FROM otp_verifications 
            WHERE email = $1 AND otp = $2
        `, [normalizedEmail, otp]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid OTP or email.' });
        }

        const otpRecord = result.rows[0];

        if (new Date() > new Date(otpRecord.expires_at)) {
            await db.query('DELETE FROM otp_verifications WHERE id = $1', [otpRecord.id]);
            return res.status(400).json({ error: 'OTP has expired.' });
        }

        // Mark user as verified
        await db.query('UPDATE users SET is_verified = TRUE WHERE email = $1', [normalizedEmail]);
        await db.query('DELETE FROM otp_verifications WHERE email = $1', [normalizedEmail]);

        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        const user = userResult.rows[0];

        const token = generateToken(user);
        const refreshToken = await generateRefreshToken(user.id);

        // Audit: OTP Verified
        await req.audit('OTP_VERIFIED', user.id, { email: normalizedEmail });

        res.status(200).json({
            message: 'Email verified successfully. Logging in...',
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ error: 'Server error during OTP verification.' });
    }
};

/**
 * POST /api/auth/:routeType/login
 * Login with email and password.
 */
exports.login = async (req, res) => {
    try {
        const { routeType } = req.params;
        const { email, password } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!['student', 'faculty'].includes(routeType)) {
            return res.status(400).json({ error: 'Invalid route type.' });
        }

        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const detected = detectRoleAndDepartment(normalizedEmail);
        if (!detected || !validateRouteAndRole(routeType, detected.role)) {
            return res.status(403).json({ error: `Cannot login to ${routeType} portal with this email.` });
        }

        const result = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Account is not verified. Please complete OTP verification.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Audit: Failed Login
            await req.audit('LOGIN_FAILED', null, { email: normalizedEmail, reason: 'Invalid password' });
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        const token = generateToken(user);
        const refreshToken = await generateRefreshToken(user.id);

        // Audit: Successful Login
        await req.audit('LOGIN_SUCCESS', user.id, { email: normalizedEmail, role: user.role });

        res.status(200).json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
};

/**
 * POST /api/auth/refresh-token
 * Exchange a valid refresh token for a new access token.
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required.' });
        }

        const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const result = await db.query(`
            SELECT rt.*, u.id as uid, u.email, u.role, u.department, u.full_name, u.is_verified
            FROM refresh_tokens rt 
            JOIN users u ON rt.user_id = u.id 
            WHERE rt.token_hash = $1 AND rt.is_revoked = false
        `, [hash]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid refresh token.' });
        }

        const record = result.rows[0];

        if (new Date() > new Date(record.expires_at)) {
            await db.query('UPDATE refresh_tokens SET is_revoked = true WHERE id = $1', [record.id]);
            return res.status(401).json({ error: 'Refresh token expired. Please login again.' });
        }

        if (!record.is_verified) {
            return res.status(403).json({ error: 'Account is not verified.' });
        }

        // Rotate: revoke old, issue new
        await db.query('UPDATE refresh_tokens SET is_revoked = true WHERE id = $1', [record.id]);

        const user = { id: record.uid, email: record.email, role: record.role, department: record.department };
        const newToken = generateToken(user);
        const newRefreshToken = await generateRefreshToken(user.id);

        res.json({
            token: newToken,
            refreshToken: newRefreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: record.full_name,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Token Refresh Error:', error);
        res.status(500).json({ error: 'Server error refreshing token.' });
    }
};

/**
 * POST /api/auth/logout
 * Revoke all refresh tokens for the user. Server-side logout.
 */
exports.logout = async (req, res) => {
    try {
        if (req.user?.userId) {
            await db.query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [req.user.userId]);
            await req.audit('LOGOUT', req.user.userId, {});
        }
        res.json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ error: 'Server error during logout.' });
    }
};
