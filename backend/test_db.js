const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college-sentiment';

async function checkUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        const email = '23x51a3325@srecnandyal.edu.in';
        const user = await User.findOne({ email });
        if (user) {
            console.log(`User found: ${user.email}, Role: ${user.role}`);
        } else {
            console.log(`User NOT found: ${email}`);
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUser();
