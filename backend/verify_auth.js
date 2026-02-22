const axios = require('axios');

async function testAuth() {
    const email = `test_${Date.now()}@srecnandyal.edu.in`;
    const password = 'Password123!';
    const baseUrl = 'http://localhost:5000/api';

    try {
        console.log('--- Testing Registration ---');
        const regRes = await axios.post(`${baseUrl}/auth/register`, { email, password, role: 'student' });
        console.log('Registration Success:', regRes.data);

        console.log('\n--- Testing Login ---');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
        console.log('Login Success!');
        console.log('Token received:', loginRes.data.token.substring(0, 20) + '...');
        console.log('User data:', loginRes.data.user);

        console.log('\n--- VERIFICATION PASSED ---');
    } catch (error) {
        console.error('\n--- VERIFICATION FAILED ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAuth();
