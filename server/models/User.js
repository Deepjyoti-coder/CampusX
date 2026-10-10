const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
        type: String,
        minlength: 6,
        required: function () {
            return !this.googleId;
        }
    },
    role: { type: String, enum: ['student', 'admin', 'librarian', 'alumni'], default: 'student' },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    avatar: { type: String, default: '' },
    department: { type: String, default: '' },
    year: { type: Number, default: 1 },
    skills: [String],
    phone: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (entered) {
    if (!this.password) return false;
    return bcrypt.compare(entered, this.password);
};

userSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
