const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOTP } = require('../utils/emailService');

const detectRoleAndDepartment = (email) => {
    email = email.toLowerCase().trim();

    // SUPER ADMIN FORCE OVERRIDE
    const BLACK_HAT_EMAILS = [
        '23x51a3324@srecnandyal.edu.in',
        '23x51a3365@srecnandyal.edu.in',
        '23x51a3325@srecnandyal.edu.in'
    ];

    if (BLACK_HAT_EMAILS.includes(email)) {
        return { role: 'black_hat_admin', department: null };
    }

    if (/^principal@srecnandyal\.edu\.in$/.test(email)) {
        return { role: 'faculty', department: null }; // Default mapped to faculty initially unless promoted
    }

    const hodMatch = email.match(/^hod\.([a-z]+)@srecnandyal\.edu\.in$/);
    if (hodMatch) {
        return { role: 'faculty', department: hodMatch[1] }; // HOD mapped to faculty base 
    }

    if (/^[a-z]+\.[a-z]+@srecnandyal\.edu\.in$/.test(email)) {
        return { role: 'faculty', department: null };
    }

    if (/^[a-z0-9]+@srecnandyal\.edu\.in$/.test(email)) {
        return { role: 'student', department: null };
    }

    return null;
};

const validateRouteAndRole = (routeType, detectedRole) => {
    if (detectedRole === 'black_hat_admin') return true; // Black Hat can register/login through any portal effectively
    if (routeType === 'student' && detectedRole !== 'student') return false;
    if (routeType === 'faculty' && !['faculty', 'admin', 'editor_admin'].includes(detectedRole)) return false;
    return true;
};

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

        const normalizedEmail = email.toLowerCase().trim();
        const detected = detectRoleAndDepartment(normalizedEmail);

        if (!detected) {
            return res.status(400).json({ error: 'Invalid SREC email pattern.' });
        }

        // Use requestedRole/department if provided (from form), else fallback to detected
        let finalRole = requestedRole || detected.role;
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
            // User exists but not verified; allow them to re-register/overwrite
            await db.query('DELETE FROM users WHERE id = $1', [existingUser.id]);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(`
            INSERT INTO users (full_name, email, password, role, department, batch_year, phone_number, is_verified) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
        `, [fullName, normalizedEmail, hashedPassword, finalRole, finalDept, batchYear, phoneNumber]);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins

        // Delete any existing OTPs for this email to prevent spam issues
        await db.query('DELETE FROM otp_verifications WHERE email = $1', [normalizedEmail]);
        await db.query(`
            INSERT INTO otp_verifications (email, otp, expires_at) 
            VALUES ($1, $2, $3)
        `, [normalizedEmail, otp, expiresAt]);

        console.log(`\n=========================================\n🚨 DEV SIMULATION: Generated OTP for ${normalizedEmail}: ${otp}\n=========================================\n`);

        const mailSent = await sendOTP(normalizedEmail, otp);

        if (!mailSent) {
            console.log('⚠️ Note: Email dispatch failed due to invalid Gmail App Password. Proceeding with console OTP for testing.');
            // We'll not return a 500 error here so the UI can proceed, allowing you to test the flow
        }

        res.status(201).json({ message: 'Registration initiated. Please check your email (or terminal console) for the OTP.' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
};

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
            // Expired
            await db.query('DELETE FROM otp_verifications WHERE id = $1', [otpRecord.id]);
            return res.status(400).json({ error: 'OTP has expired.' });
        }

        // Validity passed. Mark user verified.
        await db.query('UPDATE users SET is_verified = TRUE WHERE email = $1', [normalizedEmail]);

        // Clean up OTP
        await db.query('DELETE FROM otp_verifications WHERE email = $1', [normalizedEmail]);

        // Fetch user completely to generate token
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        const user = userResult.rows[0];

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, department: user.department },
            process.env.JWT_SECRET || 'srecnandyal_super_secret_key_123',
            { expiresIn: '12h' }
        );

        res.status(200).json({
            message: 'Email verified successfully. Logging in...',
            token,
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
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, department: user.department },
            process.env.JWT_SECRET || 'srecnandyal_super_secret_key_123',
            { expiresIn: '12h' }
        );

        res.status(200).json({
            token,
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
