const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const refreshTokenStore = require('../services/refreshTokenStore');
const { protect } = require('../middleware/auth');
const router = express.Router();

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 30);
const LOCK_MAX_ATTEMPTS = Number(process.env.AUTH_LOCK_MAX_ATTEMPTS || 5);
const LOCK_MINUTES = Number(process.env.AUTH_LOCK_MINUTES || 15);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

const signAccessToken = (id) => jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getCookieOptions = (maxAgeMs) => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: maxAgeMs
    };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000));
};

const clearAuthCookies = (res) => {
    res.clearCookie('access_token', getCookieOptions(0));
    res.clearCookie('refresh_token', getCookieOptions(0));
};

const authPayload = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    department: user.department,
    year: user.year || 1,
    skills: user.skills || [],
    authProvider: user.authProvider
});

const issueSession = async (user, req, res, family = crypto.randomUUID()) => {
    const jti = crypto.randomUUID();
    const refreshToken = jwt.sign(
        { id: user._id, type: 'refresh', jti, family },
        process.env.JWT_SECRET,
        { expiresIn: `${REFRESH_TTL_DAYS}d` }
    );

    await refreshTokenStore.createToken({
        user: user._id,
        tokenHash: hashToken(refreshToken),
        jti,
        family,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
        createdByIp: req.ip || req.socket?.remoteAddress || ''
    });

    const accessToken = signAccessToken(user._id);
    setAuthCookies(res, accessToken, refreshToken);
    return { accessToken, refreshToken, family, jti };
};

const authRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many auth attempts. Please try again later.' }
});

const loginRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login requests from this IP.' }
});

const sanitizeRoleForSignup = (role) => {
    const allowed = ['student', 'alumni'];
    return allowed.includes(role) ? role : null;
};

const incrementLoginFailure = async (user) => {
    if (!user) return;
    const now = Date.now();
    if (user.lockUntil && user.lockUntil > now) return;

    user.loginAttempts += 1;
    if (user.loginAttempts >= LOCK_MAX_ATTEMPTS) {
        user.lockUntil = new Date(now + LOCK_MINUTES * 60 * 1000);
        user.loginAttempts = 0;
    }
    await user.save();
};

const resetLoginFailure = async (user) => {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();
};

const buildOAuthState = (role) => jwt.sign({ role }, process.env.JWT_SECRET, { expiresIn: '10m' });

const parseOAuthState = (state) => {
    try {
        return jwt.verify(state, process.env.JWT_SECRET);
    } catch {
        return { role: 'student' };
    }
};

// POST /api/auth/register
router.post('/register', authRateLimit, async (req, res) => {
    try {
        const { name, email, password, role, department, year } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const cleanName = String(name || '').trim();
        const chosenRole = sanitizeRoleForSignup(role || 'student');

        if (!cleanName || !normalizedEmail || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' });
        }
        if (!chosenRole) {
            return res.status(403).json({ success: false, message: 'Only student and alumni can self-register' });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }

        const exists = await User.findOne({ email: normalizedEmail });
        if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

        const user = await User.create({
            name: cleanName,
            email: normalizedEmail,
            password,
            role: chosenRole,
            authProvider: 'local',
            department,
            year
        });
        const { accessToken } = await issueSession(user, req, res);

        res.status(201).json({ success: true, data: { token: accessToken, user: authPayload(user) } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/login
router.post('/login', loginRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (user.isLocked()) {
            return res.status(423).json({ success: false, message: 'Account temporarily locked. Try again later.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            await incrementLoginFailure(user);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await resetLoginFailure(user);
        const { accessToken } = await issueSession(user, req, res);
        res.json({ success: true, data: { token: accessToken, user: authPayload(user) } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/refresh
router.post('/refresh', authRateLimit, async (req, res) => {
    try {
        const incomingRefresh = req.cookies?.refresh_token || req.body?.refreshToken;
        if (!incomingRefresh) {
            return res.status(401).json({ success: false, message: 'Refresh token missing' });
        }

        let decoded;
        try {
            decoded = jwt.verify(incomingRefresh, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ success: false, message: 'Invalid refresh token type' });
        }

        const incomingHash = hashToken(incomingRefresh);
        const existing = await refreshTokenStore.findValidToken({ tokenHash: incomingHash, jti: decoded.jti });
        if (!existing) {
            await refreshTokenStore.revokeFamily(decoded.family);
            return res.status(401).json({ success: false, message: 'Refresh token revoked' });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ success: false, message: 'User not found' });

        await refreshTokenStore.revokeToken(existing);

        const { accessToken } = await issueSession(user, req, res, decoded.family);
        res.json({ success: true, data: { token: accessToken, user: authPayload(user) } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const incomingRefresh = req.cookies?.refresh_token || req.body?.refreshToken;
        if (incomingRefresh) {
            await refreshTokenStore.revokeTokenByHash(hashToken(incomingRefresh));
        }
        clearAuthCookies(res);
        res.json({ success: true, message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/auth/google/config
router.get('/google/config', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ success: false, message: 'Google login is not configured on server' });
    }
    res.json({ success: true, data: { clientId: process.env.GOOGLE_CLIENT_ID } });
});

// GET /api/auth/google/start?role=student
router.get('/google/start', authRateLimit, (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        return res.status(503).json({ success: false, message: 'Google OAuth not configured' });
    }

    const role = sanitizeRoleForSignup(req.query.role) || 'student';
    const state = buildOAuthState(role);
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
        state
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback
router.get('/google/callback', authRateLimit, async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code) return res.redirect(`${FRONTEND_URL}/index.html?authError=google_code_missing`);

        const statePayload = parseOAuthState(state);
        const fallbackRole = sanitizeRoleForSignup(statePayload.role) || 'student';

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString()
        });

        if (!tokenRes.ok) {
            return res.redirect(`${FRONTEND_URL}/index.html?authError=google_exchange_failed`);
        }

        const tokenJson = await tokenRes.json();
        const ticket = await googleClient.verifyIdToken({
            idToken: tokenJson.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload?.email || !payload?.sub) {
            return res.redirect(`${FRONTEND_URL}/index.html?authError=google_profile_invalid`);
        }

        let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });
        if (user) {
            user.googleId = user.googleId || payload.sub;
            user.emailVerified = !!payload.email_verified;
            user.avatar = payload.picture || user.avatar;
            user.lastLoginAt = new Date();
            if (user.authProvider !== 'local') user.authProvider = 'google';
            await user.save();
        } else {
            user = await User.create({
                name: payload.name || payload.email.split('@')[0],
                email: payload.email.toLowerCase(),
                role: fallbackRole,
                authProvider: 'google',
                googleId: payload.sub,
                avatar: payload.picture || '',
                emailVerified: !!payload.email_verified,
                lastLoginAt: new Date()
            });
        }

        await issueSession(user, req, res);

        const pageByRole = {
            student: 'student.html',
            librarian: 'librarian.html',
            admin: 'admin.html',
            alumni: 'alumni.html'
        };

        const targetPage = pageByRole[user.role] || 'student.html';
        res.redirect(`${FRONTEND_URL}/${targetPage}`);
    } catch {
        res.redirect(`${FRONTEND_URL}/index.html?authError=google_callback_failed`);
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    res.json({ success: true, data: req.user });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // don't allow password change here
        delete updates.role;
        delete updates.authProvider;
        delete updates.googleId;
        delete updates.loginAttempts;
        delete updates.lockUntil;
        delete updates.emailVerified;
        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
