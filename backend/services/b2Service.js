/**
 * Backblaze B2 Service — Cloud Storage Manager
 * ================================================
 * Handles all Backblaze B2 operations:
 *  - Authorization & connection
 *  - File upload (streaming)
 *  - File deletion
 *  - Storage usage tracking
 *  - Role-based upload limits
 *
 * Files are stored with logical folder structure:
 *   students/{userId}/{filename}
 *   faculty/{userId}/{filename}
 *   admin/{filename}
 * ================================================
 */
const B2 = require('backblaze-b2');
const crypto = require('crypto');
const path = require('path');

// ============================================
// B2 CONFIGURATION (lazy-initialized)
// ============================================
let b2 = null;

const getB2Client = () => {
    if (!b2) {
        b2 = new B2({
            applicationKeyId: process.env.B2_KEY_ID,
            applicationKey: process.env.B2_APP_KEY,
        });
    }
    return b2;
};

let BUCKET_NAME = null;
const getBucketName = () => {
    if (!BUCKET_NAME) BUCKET_NAME = process.env.B2_BUCKET_NAME || 'college-videos';
    return BUCKET_NAME;
};

let bucketId = null;
let downloadUrl = null;
let authToken = null;
let uploadUrl = null;
let uploadAuthToken = null;
let lastAuthTime = 0;

// Re-authorize every 20 hours (B2 tokens expire after 24h)
const AUTH_REFRESH_MS = 20 * 60 * 60 * 1000;

// ============================================
// UPLOAD LIMITS PER ROLE
// ============================================
const UPLOAD_LIMITS = {
    'black_hat_admin': Infinity,
    'admin': Infinity,
    'editor_admin': Infinity,
    'faculty': 50,
    'student': 20,
};

// ============================================
// ALLOWED FILE TYPES
// ============================================
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_PDF_TYPES = ['application/pdf'];
const ALL_ALLOWED_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Authorize with B2 and cache credentials.
 */
const authorize = async () => {
    const now = Date.now();
    if (authToken && (now - lastAuthTime) < AUTH_REFRESH_MS) {
        return; // Already authorized and token is fresh
    }

    try {
        // Debug: Log whether env vars are loaded
        const keyId = process.env.B2_KEY_ID;
        const appKey = process.env.B2_APP_KEY;
        console.log(`[B2 Auth] Key ID loaded: ${keyId ? keyId.substring(0, 8) + '...' : 'MISSING'}`);
        console.log(`[B2 Auth] App Key loaded: ${appKey ? appKey.substring(0, 8) + '...' : 'MISSING'}`);
        console.log(`[B2 Auth] Bucket Name: ${getBucketName()}`);

        const authResponse = await getB2Client().authorize();
        downloadUrl = authResponse.data.downloadUrl;
        authToken = authResponse.data.authorizationToken;
        lastAuthTime = now;

        // Get bucket ID
        const buckets = await getB2Client().listBuckets();
        const bucket = buckets.data.buckets.find(b => b.bucketName === getBucketName());
        if (!bucket) {
            throw new Error(`Bucket "${getBucketName()}" not found. Available: ${buckets.data.buckets.map(b => b.bucketName).join(', ')}`);
        }
        bucketId = bucket.bucketId;

        // Get upload URL
        const uploadUrlResponse = await getB2Client().getUploadUrl({ bucketId });
        uploadUrl = uploadUrlResponse.data.uploadUrl;
        uploadAuthToken = uploadUrlResponse.data.authorizationToken;

        console.log(`✅ B2 authorized. Bucket: ${getBucketName()} (${bucketId})`);
    } catch (error) {
        console.error('❌ B2 Authorization failed:', error.response?.data || error.message);
        // Reset cached values so next call retries
        authToken = null;
        lastAuthTime = 0;
        throw new Error(`B2 storage unavailable: ${error.response?.data?.message || error.message}`);
    }
};

/**
 * Generate a unique filename with logical folder structure.
 * Pattern: {roleFolder}/{userId}/{timestamp}_{random}.{ext}
 */
const generateFilePath = (userId, role, originalName, mimeType) => {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(originalName) || getExtFromMime(mimeType);

    let folder;
    if (['black_hat_admin', 'admin', 'editor_admin'].includes(role)) {
        folder = 'admin';
    } else if (role === 'faculty') {
        folder = `faculty/${userId}`;
    } else {
        folder = `students/${userId}`;
    }

    return `${folder}/${timestamp}_${randomSuffix}${ext}`;
};

/**
 * Get file extension from MIME type if original name has none.
 */
const getExtFromMime = (mimeType) => {
    const map = {
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
        'video/mov': '.mov',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
    };
    return map[mimeType] || '.bin';
};

/**
 * Upload a file buffer to B2.
 * Returns the public file URL.
 */
const uploadFile = async (buffer, originalName, mimeType, userId, role) => {
    // Validate file type
    if (!ALL_ALLOWED_TYPES.includes(mimeType)) {
        throw new Error(`File type "${mimeType}" is not allowed. Accepted: images, videos (mp4/webm/mov), PDF.`);
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Maximum: 100MB.`);
    }

    await authorize();

    const fileName = generateFilePath(userId, role, originalName, mimeType);

    try {
        // Get a fresh upload URL for each upload (B2 best practice)
        const uploadUrlResponse = await getB2Client().getUploadUrl({ bucketId });

        const response = await getB2Client().uploadFile({
            uploadUrl: uploadUrlResponse.data.uploadUrl,
            uploadAuthToken: uploadUrlResponse.data.authorizationToken,
            fileName,
            data: buffer,
            mime: mimeType,
            hash: crypto.createHash('sha1').update(buffer).digest('hex'),
            info: {
                'b2-content-disposition': `inline; filename="${path.basename(originalName)}"`,
                'b2-cache-control': 'public, max-age=31536000', // 1 year cache
            },
        });

        const fileUrl = `${downloadUrl}/file/${getBucketName()}/${fileName}`;

        console.log(`📤 B2 Upload: ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);

        return {
            fileUrl,
            fileId: response.data.fileId,
            fileName,
            fileSize: buffer.length,
            contentType: mimeType,
        };
    } catch (error) {
        // If auth expired mid-upload, retry once
        if (error.response?.status === 401) {
            authToken = null;
            lastAuthTime = 0;
            await authorize();

            const uploadUrlResponse = await getB2Client().getUploadUrl({ bucketId });
            const response = await getB2Client().uploadFile({
                uploadUrl: uploadUrlResponse.data.uploadUrl,
                uploadAuthToken: uploadUrlResponse.data.authorizationToken,
                fileName,
                data: buffer,
                mime: mimeType,
                hash: crypto.createHash('sha1').update(buffer).digest('hex'),
            });

            const fileUrl = `${downloadUrl}/file/${getBucketName()}/${fileName}`;
            return {
                fileUrl,
                fileId: response.data.fileId,
                fileName,
                fileSize: buffer.length,
                contentType: mimeType,
            };
        }

        console.error('❌ B2 Upload failed:', error.message);
        throw new Error('Cloud storage upload failed. Please try again.');
    }
};

/**
 * Delete a file from B2 by fileName and fileId.
 */
const deleteFile = async (fileName, fileId) => {
    try {
        await authorize();

        // If we don't have fileId, look it up
        if (!fileId && fileName) {
            const versions = await getB2Client().listFileVersions({
                bucketId,
                startFileName: fileName,
                maxFileCount: 1,
            });

            if (versions.data.files.length > 0 && versions.data.files[0].fileName === fileName) {
                fileId = versions.data.files[0].fileId;
            } else {
                console.warn(`⚠️ File not found in B2: ${fileName}`);
                return false;
            }
        }

        await getB2Client().deleteFileVersion({ fileId, fileName });
        console.log(`🗑️ B2 Deleted: ${fileName}`);
        return true;
    } catch (error) {
        console.error('❌ B2 Delete failed:', error.message);
        return false;
    }
};

/**
 * Check how many media files a user has uploaded (from DB).
 * Returns { count, limit, canUpload }
 */
const checkUploadLimit = async (db, userId, role) => {
    const limit = UPLOAD_LIMITS[role] || UPLOAD_LIMITS['student'];

    if (limit === Infinity) {
        return { count: 0, limit: 'unlimited', canUpload: true };
    }

    // Count posts with media by this user
    const result = await db.query(
        `SELECT COUNT(*) as count FROM posts 
         WHERE author_id = $1 
         AND (image_url IS NOT NULL OR video_url IS NOT NULL OR pdf_url IS NOT NULL)`,
        [userId]
    );

    const count = parseInt(result.rows[0].count) || 0;

    return {
        count,
        limit,
        canUpload: count < limit,
        remaining: Math.max(0, limit - count),
    };
};

/**
 * Extract the B2 file name from a full URL.
 * e.g., https://f005.backblazeb2.com/file/college-videos/students/abc/123.mp4
 * → students/abc/123.mp4
 */
const getFileNameFromUrl = (url) => {
    if (!url) return null;
    const marker = `/file/${getBucketName()}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
};

/**
 * Get a presigned upload URL for direct browser uploads.
 * Returns uploadUrl, authToken, and the generated fileName.
 */
const getPresignedUploadUrl = async (userId, role, originalName, mimeType) => {
    // Validate file type
    if (!ALL_ALLOWED_TYPES.includes(mimeType)) {
        throw new Error(`File type "${mimeType}" is not allowed.`);
    }

    await authorize();

    const fileName = generateFilePath(userId, role, originalName, mimeType);
    const uploadUrlResponse = await getB2Client().getUploadUrl({ bucketId });

    return {
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        authorizationToken: uploadUrlResponse.data.authorizationToken,
        fileName,
        bucketId,
        downloadUrl: `${downloadUrl}/file/${getBucketName()}/${fileName}`,
    };
};

module.exports = {
    authorize,
    uploadFile,
    deleteFile,
    checkUploadLimit,
    getFileNameFromUrl,
    getPresignedUploadUrl,
    generateFilePath,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_PDF_TYPES,
    MAX_FILE_SIZE,
};
