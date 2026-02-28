/**
 * One-time script to configure CORS rules on B2 bucket
 * for direct browser uploads.
 * 
 * Run: node setup_b2_cors.js
 */
const B2 = require('backblaze-b2');
require('dotenv').config();

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY,
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME || 'college-videos';

async function setupCors() {
    try {
        console.log('Authorizing with B2...');
        const authResponse = await b2.authorize();
        console.log('✅ Authorized');

        // Get bucket ID
        let bucketId;
        if (authResponse.data.allowed?.bucketId) {
            bucketId = authResponse.data.allowed.bucketId;
            console.log(`Bucket ID from auth: ${bucketId}`);
        } else {
            const buckets = await b2.listBuckets();
            const bucket = buckets.data.buckets.find(b => b.bucketName === BUCKET_NAME);
            if (!bucket) {
                throw new Error(`Bucket "${BUCKET_NAME}" not found`);
            }
            bucketId = bucket.bucketId;
            console.log(`Bucket ID from listBuckets: ${bucketId}`);
        }

        // Set CORS rules
        console.log('\nSetting CORS rules...');
        const corsRules = [
            {
                corsRuleName: 'allowDirectUploads',
                allowedOrigins: ['*'],
                allowedHeaders: ['*'],
                allowedOperations: [
                    'b2_upload_file',
                    'b2_download_file_by_name',
                    'b2_download_file_by_id',
                    's3_put',
                    's3_get',
                    's3_head',
                ],
                exposeHeaders: ['x-bz-content-sha1', 'x-bz-file-name', 'x-bz-info-src_last_modified_millis'],
                maxAgeSeconds: 86400,
            },
        ];

        await b2.updateBucket({
            bucketId,
            bucketType: 'allPublic',
            corsRules,
        });

        console.log('✅ CORS rules configured successfully!');
        console.log('\nCORS Rules applied:');
        console.log(JSON.stringify(corsRules, null, 2));
        console.log('\nDirect browser uploads should now work from any origin.');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.log('\n⚠️  Your B2 key may not have the "writeBuckets" capability.');
            console.log('You can set CORS manually in the Backblaze dashboard:');
            console.log('1. Go to https://secure.backblaze.com/b2_buckets.htm');
            console.log('2. Click your bucket → Bucket Settings');
            console.log('3. Under "Bucket Info" or CORS Rules, add the following JSON:');
            console.log(JSON.stringify([{
                corsRuleName: 'allowDirectUploads',
                allowedOrigins: ['*'],
                allowedHeaders: ['*'],
                allowedOperations: ['b2_upload_file', 'b2_download_file_by_name'],
                exposeHeaders: ['x-bz-content-sha1'],
                maxAgeSeconds: 86400,
            }], null, 2));
        }
    }
}

setupCors();
