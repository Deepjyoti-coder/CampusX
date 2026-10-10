const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer = null;

const autoSeedIfEmpty = async () => {
    try {
        const User = require('../models/User');
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log('🌱 Database is empty. Seeding demo accounts and initial data...');
            const { seed } = require('../seed');
            await seed({ clear: false });
            console.log('✅ Demo accounts seeded successfully!');
        }
    } catch (err) {
        console.error('⚠️ Auto-seed check error:', err.message);
    }
};

const connectDB = async () => {
    const primaryUri = process.env.MONGO_URI;

    // 1. Try configured MongoDB connection (e.g., local MongoDB or Atlas)
    if (primaryUri) {
        try {
            const conn = await mongoose.connect(primaryUri, {
                serverSelectionTimeoutMS: 2000
            });
            console.log(`✅ MongoDB connected: ${conn.connection.host}`);
            await autoSeedIfEmpty();
            return conn;
        } catch (err) {
            console.warn(`⚠️ Primary MongoDB unavailable (${err.message}). Starting embedded In-Memory database...`);
        }
    }

    // 2. Fallback to embedded In-Memory MongoDB so authentication & all features work out-of-the-box
    try {
        if (!memoryServer) {
            memoryServer = await MongoMemoryServer.create();
        }
        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`✅ Embedded In-Memory MongoDB connected: ${memUri}`);
        await autoSeedIfEmpty();
        return conn;
    } catch (err) {
        console.error(`❌ In-Memory MongoDB startup error: ${err.message}`);
    }
};

module.exports = connectDB;
