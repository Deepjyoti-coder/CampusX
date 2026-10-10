require('dotenv').config({ path: require('node:path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const connectDB = require('./config/db');
const { getRedisClient } = require('./config/redis');

const app = express();

// Middleware
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:5000').split(',').map(o => o.trim()).filter(Boolean));
app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (the frontend)
app.use(express.static(path.join(__dirname, '..')));

// Uploads directory
const fs = require('node:fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/resume', require('./routes/resume'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/career', require('./routes/career'));
app.use('/api/mentorship', require('./routes/mentorship'));
app.use('/api/alumni', require('./routes/alumni'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/translate', require('./routes/translate'));

// ── Cron Jobs ───────────────────────────────────────────────
require('./jobs/overdueChecker');
require('./jobs/attendanceSummary');

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'CampusAI server is running', timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        getRedisClient();
        app.listen(PORT, () => {
            console.log(`🚀 CampusAI server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Fatal startup error:', err);
    }
};

startServer();
