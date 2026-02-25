const db = require('./db');

async function updateAdmin() {
    try {
        const email = '23x51a3365@srecnandyal.edu.in';
        console.log(`Updating role to admin for email: ${email}`);
        await db.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
        console.log('SUCCESS: User role updated to admin');
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not update user role');
        console.error(err);
        process.exit(1);
    }
}

updateAdmin();
