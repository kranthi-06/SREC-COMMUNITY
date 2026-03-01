require('dotenv').config();
const db = require('../db');
const crypto = require('crypto');

async function test() {
    try {
        const email = '23x51a3324@srecnandyal.edu.in';
        const otp = '147026';

        console.log('1. Querying OTP...');
        const result = await db.query(
            'SELECT * FROM otp_verifications WHERE email = $1 AND otp = $2',
            [email, otp]
        );
        console.log('   Found:', result.rows.length, 'rows');

        if (result.rows.length === 0) {
            console.log('   No match! Checking all OTPs for this email:');
            const all = await db.query('SELECT otp, expires_at FROM otp_verifications WHERE email = $1', [email]);
            all.rows.forEach(r => console.log(`   Stored OTP: "${r.otp}" (len: ${r.otp.length})`));
            process.exit(1);
        }

        const otpRecord = result.rows[0];
        console.log('2. Checking expiry...');
        console.log('   Expired:', new Date() > new Date(otpRecord.expires_at));

        console.log('3. Generating reset token...');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetExpiry = new Date(Date.now() + 10 * 60000);
        console.log('   Token generated OK');

        console.log('4. Updating DB...');
        await db.query(
            'UPDATE otp_verifications SET otp = $1, expires_at = $2 WHERE email = $3',
            [resetTokenHash, resetExpiry, email]
        );
        console.log('   DB updated OK');

        console.log('5. Fetching user for audit...');
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        console.log('   User found:', userResult.rows.length > 0);

        console.log('\n✅ ALL STEPS PASSED! Reset token:', resetToken.substring(0, 20) + '...');
    } catch (err) {
        console.error('❌ FAILED at step:', err.message);
        console.error('   Stack:', err.stack?.substring(0, 500));
    }
    process.exit();
}
test();
