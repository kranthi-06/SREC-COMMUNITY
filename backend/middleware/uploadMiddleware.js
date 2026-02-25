const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists - In Vercel, use /tmp if possible, but for diskStorage we need a writable path
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.error('Upload directory creation failed:', err);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Only PDF, images and common media
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'video/mp4', 'video/quicktime',
        'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
