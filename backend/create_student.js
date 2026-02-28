const db = require('./db');
const bcrypt = require('bcryptjs');

async function createStudent() {
    try {
        const email = 'student.test@srecnandyal.edu.in';
        const password = 'password123';
        const fullName = 'Test Student';
        const department = 'ECE';
        const role = 'student';
        const batchYear = '2023-2027';

        console.log(`Creating student user: ${email}`);

        // Check if user already exists
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            console.log('User already exists. Updating password and ensuring student role...');
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.query(`
                UPDATE users 
                SET password = $1, role = $2, full_name = $3, department = $4, batch_year = $5, is_verified = TRUE 
                WHERE email = $6
            `, [hashedPassword, role, fullName, department, batchYear, email]);
        } else {
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.query(`
                INSERT INTO users (email, password, full_name, role, department, batch_year, is_verified)
                VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            `, [email, hashedPassword, fullName, role, department, batchYear]);
        }

        console.log('SUCCESS: Student user created/updated.');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not create student user');
        console.error(err);
        process.exit(1);
    }
}

createStudent();
