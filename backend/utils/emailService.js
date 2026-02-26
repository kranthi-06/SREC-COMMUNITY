const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change provider
    auth: {
        user: process.env.EMAIL_USER || 'aradhyaresumewriters@gmail.com',
        pass: process.env.EMAIL_PASS || 'azeg ebnn ndtn ivkp' // Replace with your app password or use process env
    }
});

const sendOTP = async (toEmail, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'aradhyaresumewriters@gmail.com',
            to: toEmail,
            subject: 'CampusPulse - Verification OTP',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #8B9A46; text-align: center;">CampusPulse Identity Verification</h2>
                <p style="font-size: 16px; color: #333;">Your registration demands verification. Please use the One-Time Password below to confirm your identity.</p>
                <div style="background-color: #f7f9f2; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #777; text-align: center;">This code is valid for 5 minutes. Do not share it with anyone.</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
                <p style="font-size: 12px; color: #aaa; text-align: center;">Santhiram Engineering College Nandyal - CampusPulse System</p>
            </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
};

module.exports = { sendOTP };
