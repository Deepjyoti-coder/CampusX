const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    departments: [{ type: String, trim: true }], // e.g. ['Computer Science and Engineering', 'University-wide']
    eligibleYears: [{ type: Number }], // e.g. [1, 2, 3, 4]; empty means all years
    category: {
        type: String,
        default: 'General announcement',
        trim: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    publishingDepartment: { type: String, default: 'Administration', trim: true },
    authorName: { type: String, default: 'Campus Admin', trim: true },
    attachments: [{
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        type: { type: String, default: 'document' },
        size: { type: String, default: '' }
    }],
    externalLink: { type: String, default: '', trim: true },
    registrationLink: { type: String, default: '', trim: true },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    pinned: { type: Boolean, default: false },
    contactInfo: { type: String, default: '', trim: true },
    icon: { type: String, default: '📢' },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

noticeSchema.virtual('description').get(function () {
    return this.content;
});
noticeSchema.virtual('isPinned').get(function () {
    return this.pinned;
});
noticeSchema.virtual('department').get(function () {
    return this.publishingDepartment || (this.departments && this.departments[0]) || 'General';
});

noticeSchema.set('toJSON', { virtuals: true });
noticeSchema.set('toObject', { virtuals: true });

noticeSchema.index({ status: 1, pinned: -1, publishedAt: -1 });
noticeSchema.index({ departments: 1 });
noticeSchema.index({ category: 1, priority: 1 });
noticeSchema.index({ title: 'text', content: 'text', publishingDepartment: 'text' });

module.exports = mongoose.model('Notice', noticeSchema);
