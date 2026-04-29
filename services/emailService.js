const nodemailer = require('nodemailer');

const createTransporter = () => {
    // Check if we have production SMTP settings
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback: Use Ethereal for testing if no real credentials
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'tester@ethereal.email', // Replace with real Ethereal account if needed
            pass: 'password123',
        },
    });
};

const sendEmail = async (options) => {
    try {
        const transporter = createTransporter();

        const message = {
            from: `${process.env.FROM_NAME || 'GiftKart'} <${process.env.FROM_EMAIL || 'no-reply@giftkart.com'}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html,
        };

        const info = await transporter.sendMail(message);
        console.log('Email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

/**
 * Send OTP for Password Reset
 */
const sendOTP = async (email, otp) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 10px;">
            <h2 style="color: #8b5cf6; text-align: center;">GiftKart Verification</h2>
            <p>Hello,</p>
            <p>You requested a password reset. Use the following OTP to verify your account:</p>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="letter-spacing: 5px; color: #1e293b; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">GiftKart - Premium Personalized Gifting</p>
        </div>
    `;

    return sendEmail({
        email,
        subject: 'Your Password Reset OTP - GiftKart',
        html
    });
};

module.exports = {
    sendEmail,
    sendOTP
};
