const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'srecnandyal_super_secret_key_123');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

const studentOnly = (req, res, next) => {
    // Students and Black Hat Admins (who are students)
    if (req.user && ['student', 'black_hat_admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Students only' });
    }
};

const facultyOnly = (req, res, next) => {
    // Only faculty.
    if (req.user && req.user.role === 'faculty') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Faculty only' });
    }
};

const blackHatOnly = (req, res, next) => {
    // ONLY Black Hat Admin
    if (req.user && req.user.role === 'black_hat_admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Super Admin clearance required' });
    }
};

const adminOnly = (req, res, next) => {
    // Black Hat Admin, Admin, Editor Admin
    if (req.user && ['black_hat_admin', 'admin', 'editor_admin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Admins only' });
    }
};

const postCreators = (req, res, next) => {
    // Black Hat, Admin, Editor Admin, Faculty
    if (req.user && ['black_hat_admin', 'admin', 'editor_admin', 'faculty'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Students cannot create posts' });
    }
};

module.exports = { protect, studentOnly, facultyOnly, blackHatOnly, adminOnly, postCreators };
