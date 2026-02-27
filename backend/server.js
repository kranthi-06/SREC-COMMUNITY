/**
 * server.js — CampusPulse Backend Entry Point
 * =============================================
 * Production-grade Express server with:
 *  - Helmet security headers
 *  - Rate limiting
 *  - XSS/HPP protection 
 *  - Audit logging middleware
 *  - Modular route system
 *  - Global error handling
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`Created uploads directory at: ${uploadsDir}`);
    }
} catch (err) {
    console.warn('Could not create uploads directory (might be read-only):', err.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

const db = require('./db');
const { attachAudit } = require('./middleware/auditMiddleware');

// ============================================
// SECURITY MIDDLEWARE STACK
// ============================================

// 1. Helmet — sets secure HTTP headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Allow inline styles for React
}));

// 2. CORS — restrict origins in production
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Body parsing with size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. HPP — HTTP Parameter Pollution protection
app.use(hpp());

// 5. Rate Limiting — Global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait and try again.' }
});
app.use('/api', globalLimiter);

// 6. Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // 15 auth attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please wait 15 minutes.' }
});
app.use('/api/auth', authLimiter);

// 7. Audit logging — attaches req.audit() to every request
app.use(attachAudit);

// ============================================
// STATIC FILES
// ============================================
app.use('/uploads', express.static(uploadsDir));
if (process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.get('/uploads/:filename', (req, res) => {
        const filePath = path.join(uploadsDir, req.params.filename);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send('File not found');
        }
    });
}

// ============================================
// IMPORT ROUTES
// ============================================
const reviewRoutes = require('./routes/reviewRoutes');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');

// ============================================
// MOUNT ROUTES
// ============================================
app.use('/api/reviews', reviewRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'ok',
            db: 'connected (PostgreSQL)',
            version: '2.0.0',
            security: {
                helmet: true,
                rateLimiting: true,
                auditLogging: true,
                hpp: true
            }
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            db: 'disconnected',
            error: err.message
        });
    }
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);

    // Log critical errors to audit
    if (req.audit) {
        req.audit('UNHANDLED_ERROR', null, {
            error: err.message,
            stack: err.stack?.substring(0, 500)
        }).catch(() => { });
    }

    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
    try {
        await db.query('SELECT NOW()');
        console.log('✅ Connected to Supabase PostgreSQL');

        app.listen(PORT, () => {
            console.log(`🚀 CampusPulse Server v2.0 running on port ${PORT}`);
            console.log(`🔒 Security: Helmet ✓ | Rate Limiting ✓ | HPP ✓ | Audit ✓`);
        });
    } catch (err) {
        console.error('❌ Failed to connect to PostgreSQL:', err);
    }
};

// Start server if not running in Vercel
if (!process.env.VERCEL) {
    startServer();
}

module.exports = app;
