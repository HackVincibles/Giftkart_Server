const User = require('../models/User');
const Wallet = require('../models/Wallet');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

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
        const { displayName, email, password } = req.body;
        console.log('Registration attempt:', { displayName, email });

        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        user = await User.create({ displayName, email, password, authMethod: 'local' });
        console.log('User created successfully:', user._id, user.email);
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

        if (!user || user.authMethod !== 'local' || !(await user.matchPassword(password))) {
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
        } else {
            res.redirect(`${process.env.CLIENT_URL}/dashboard`);
        }
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
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
