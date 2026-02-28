const db = require('./db');
const bcrypt = require('bcryptjs');

async function createFaculty() {
    try {
        const email = 'faculty.test@srecnandyal.edu.in';
        const password = 'password123';
        const fullName = 'Test Faculty';
        const department = 'CSE';
        const role = 'faculty';

        console.log(`Creating faculty user: ${email}`);

        // Check if user already exists
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            console.log('User already exists. Updating password and ensuring faculty role...');
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.query(`
                UPDATE users 
                SET password = $1, role = $2, full_name = $3, department = $4, is_verified = TRUE 
                WHERE email = $5
            `, [hashedPassword, role, fullName, department, email]);
        } else {
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.query(`
                INSERT INTO users (email, password, full_name, role, department, is_verified)
                VALUES ($1, $2, $3, $4, $5, TRUE)
            `, [email, hashedPassword, fullName, role, department]);
        }

        console.log('SUCCESS: Faculty user created/updated.');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not create faculty user');
        console.error(err);
        process.exit(1);
    }
}

createFaculty();
