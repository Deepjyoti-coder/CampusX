const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['Notice', 'Event', 'LostFound', 'Department', 'User'], required: true },
    targetId: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
