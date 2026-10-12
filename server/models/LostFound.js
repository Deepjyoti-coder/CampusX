const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proofDetails: { type: String, required: true, trim: true }, // Secret identifying proof (wallpaper, serial number, scratch details)
    contactInfo: { type: String, default: '', trim: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, default: '' }
}, { _id: true });

const lostFoundSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: {
        type: String,
        enum: ['lost', 'found'],
        required: true,
        default: 'lost'
    },
    category: {
        type: String,
        default: 'Electronics',
        trim: true
    },
    status: {
        type: String,
        enum: ['open', 'potential_match', 'claim_pending', 'verification_in_progress', 'returned', 'closed', 'hidden'],
        required: true,
        default: 'open'
    },
    location: { type: String, default: '', trim: true, maxlength: 160 },
    campusZone: { type: String, default: 'General Campus', trim: true },
    dateOccurred: { type: Date, default: Date.now },
    timeApprox: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    color: { type: String, default: '', trim: true, maxlength: 60 },
    identifyingFeatures: { type: String, default: '', trim: true, maxlength: 500 },
    icon: { type: String, default: '📦', trim: true, maxlength: 8 },
    images: [{ type: String }],
    holdingLocation: { type: String, default: 'With Reporter', trim: true }, // e.g. "Campus Security Office", "Library Front Desk"
    handedToSecurity: { type: Boolean, default: false },
    isSensitive: { type: Boolean, default: false }, // ID cards, wallets, confidential documents
    contactPreference: {
        type: String,
        default: 'in_app'
    },
    contactPhone: { type: String, default: '', trim: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    matchedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'LostFound', default: null },
    claims: [claimSchema],
    moderation: {
        flagged: { type: Boolean, default: false },
        flagReason: { type: String, default: '' },
        hidden: { type: Boolean, default: false },
        moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        moderatedAt: { type: Date },
        notes: { type: String, default: '' }
    },
    secretIdentifyingDetails: { type: String, default: '', select: false, trim: true },
    handedOverToSecurityAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null }
}, { timestamps: true });

lostFoundSchema.virtual('date').get(function () {
    return this.dateOccurred;
});

lostFoundSchema.set('toJSON', { virtuals: true });
lostFoundSchema.set('toObject', { virtuals: true });

lostFoundSchema.index({ type: 1, status: 1, createdAt: -1 });
lostFoundSchema.index({ category: 1, dateOccurred: -1 });
lostFoundSchema.index({ reportedBy: 1, createdAt: -1 });
lostFoundSchema.index({ name: 'text', location: 'text', description: 'text', color: 'text' });

module.exports = mongoose.model('LostFound', lostFoundSchema);
