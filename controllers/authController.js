const User = require('../models/User');
const Wallet = require('../models/Wallet');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const { sendOTP, sendEmail } = require('../services/emailService');
const crypto = require('crypto');

// Helper to get Google Client (Ensures ENV is loaded)
const getOAuth2Client = () => {
    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`
    );
};

// Generate JWT and set Cookie
const sendToken = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.SESSION_SECRET, {
        expiresIn: '24h'
    });

    const cookieOptions = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: false, // Set to false for localhost testing
        sameSite: 'lax'
    };

    res.status(statusCode).cookie('jwt', token, cookieOptions).json({
        success: true,
        token, // Return token for frontend storage
        user: {
            id: user._id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        }
    });
};

// @desc    Register user (Manual)
exports.register = async (req, res) => {
    try {
        const { displayName, email, password, role, referralCode } = req.body;
        console.log('Registration attempt:', { displayName, email, role });

        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user with role
        user = await User.create({ 
            displayName, 
            email, 
            password, 
            role: role || 'buyer',
            authMethod: 'local',
            buyerProfile: role === 'buyer' ? { preferences: [], interests: [], shippingAddress: {} } : undefined,
            creatorProfile: role === 'creator' ? { studioName: '', bio: '', portfolioLinks: [], bankDetails: {} } : undefined
        });
        console.log('User created successfully:', user._id, user.email, user.role);
        
        // Initialize Wallet for new user
        await Wallet.create({ user: user._id });

        // Process referral if code exists
        if (referralCode) {
            try {
                const referralController = require('./referralController');
                await referralController.processReferral(referralCode, user._id);
            } catch (refErr) {
                console.error('Referral Processing Error:', refErr);
            }
        }

        // Send Welcome Email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to GiftKart - Your Journey into Premium Gifting Begins!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <h2 style="color: #8b5cf6; text-align: center;">Welcome to GiftKart! 🎁</h2>
                        <p>Hello ${user.displayName},</p>
                        <p>Thank you for joining GiftKart, the ultimate destination for premium, personalized gifts.</p>
                        <p>Whether you're here to find the perfect gift for a loved one or to showcase your own artisan creations, we're excited to have you on board.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1e293b;">Getting Started:</h3>
                            <ul style="color: #475569;">
                                <li>Explore our AI-powered gift recommendations</li>
                                <li>Setup your gift calendar so you never miss a birthday</li>
                                <li>Connect with unique artisans from across the country</li>
                            </ul>
                        </div>
                        <p>Happy Gifting!</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0;" />
                        <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">The GiftKart Team</p>
                    </div>
                `
            });
        } catch (mailErr) {
            console.error('Welcome email failed:', mailErr);
        }
        
        sendToken(user, 201, res);
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Login user (Manual)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        const user = await User.findOne({ email }).select('+password');
        console.log('User found:', user ? user._id : 'No user found');

        if (!user || !user.password || !(await user.matchPassword(password))) {
            console.log('Invalid credentials for:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('Login successful for:', user._id, user.email);
        sendToken(user, 200, res);
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get Google Auth URL
exports.getGoogleUrl = (req, res) => {
    console.log('--- Google Auth Requested ---');
    const client = getOAuth2Client();
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
        prompt: 'select_account'
    });
    console.log('Redirecting user to:', url);
    res.json({ url });
};

// @desc    Google Auth Callback Handler
exports.googleCallback = async (req, res) => {
    console.log('--- Google Callback Hit ---');
    const { code } = req.query;
    const client = getOAuth2Client();

    try {
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const googleUserRes = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`
        );

        const googleUser = googleUserRes.data;
        let user = await User.findOne({ email: googleUser.email });

        if (user) {
            user.googleId = googleUser.id;
            user.avatar = googleUser.picture;
            await user.save();
        } else {
            user = await User.create({
                googleId: googleUser.id,
                email: googleUser.email,
                displayName: googleUser.name,
                avatar: googleUser.picture,
                authMethod: 'google'
            });
        }

        const jwtToken = jwt.sign({ id: user._id }, process.env.SESSION_SECRET, { expiresIn: '24h' });
        res.cookie('jwt', jwtToken, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: false, // Set to false for localhost
            sameSite: 'lax'
        });

        if (user.role === 'unassigned') {
            res.redirect(`${process.env.CLIENT_URL}/select-role`);
        } else if (user.role === 'admin') {
            res.redirect(`${process.env.CLIENT_URL}/admin`);
        } else if (user.role === 'creator') {
            res.redirect(`${process.env.CLIENT_URL}/creator-dashboard`);
        } else {
            res.redirect(`${process.env.CLIENT_URL}/dashboard`);
        }
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
};

// @desc    Client-side Google Auth (POST token)
exports.googleLoginClient = async (req, res) => {
    try {
        const { token, role } = req.body;
        const client = getOAuth2Client();
        
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        
        let user = await User.findOne({ email: payload.email });
        
        if (user) {
            user.googleId = payload.sub;
            user.avatar = payload.picture;
            // Only update role if it's currently unassigned and a new role is requested
            if (user.role === 'unassigned' && role) {
                user.role = role;
            }
            await user.save();
        } else {
            user = await User.create({
                googleId: payload.sub,
                email: payload.email,
                displayName: payload.name,
                avatar: payload.picture,
                authMethod: 'google',
                role: role || 'buyer' // Default to buyer or selected role
            });
            
            // Initialize Wallet for new user
            await Wallet.create({ user: user._id });
        }
        
        sendToken(user, 200, res);
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(401).json({ message: 'Invalid Google token' });
    }
};

// @desc    Logout user
exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true });
};

// @desc    Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json(user);
    } catch (err) {
        console.error('GetMe Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Set user role
exports.setRole = async (req, res) => {
    const { role } = req.body;
    try {
        const user = await User.findById(req.user.id);
        user.role = role;
        
        if (role === 'buyer') user.buyerProfile = { preferences: [], interests: [], shippingAddress: {} };
        if (role === 'creator') user.creatorProfile = { studioName: '', bio: '', portfolioLinks: [], bankDetails: {} };

        await user.save();

        // Initialize Wallet for the user
        await Wallet.findOneAndUpdate(
            { user: user._id },
            { user: user._id },
            { upsert: true, new: true }
        );

        res.status(200).json(user);
    } catch (err) {
        console.error('SetRole Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// @desc    Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found with that email' });
        }

        // Allow all users to reset/set a password, even if they initially used Google

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP and Expiry (10 mins)
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Send Email
        await sendOTP(email, otp);

        res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
};

// @desc    Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ 
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        res.status(200).json({ success: true, message: 'OTP verified' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const user = await User.findOne({ 
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
