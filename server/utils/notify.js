const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { emitRealtime } = require('../realtime');

async function sendNotification({
    userId,
    title,
    message,
    type = 'system',
    priority = 'normal',
    linkTab = 'updates',
    targetId = '',
    meta = {}
}) {
    try {
        if (!userId) return null;

        // Prevent duplicate notification within last 10 minutes
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const exists = await Notification.findOne({
            user: userId,
            title,
            createdAt: { $gte: tenMinsAgo }
        });
        if (exists) return exists;

        const notif = await Notification.create({
            user: userId,
            title,
            message,
            type,
            priority,
            linkTab,
            targetId,
            meta
        });

        emitRealtime(`notification:${userId}`, {
            notification: notif,
            timestamp: new Date().toISOString()
        });

        return notif;
    } catch (err) {
        console.error('[notify] error creating notification:', err.message);
        return null;
    }
}

async function recordAuditLog({
    actor,
    actorName,
    actorRole,
    action,
    targetType,
    targetId,
    details = {},
    ip = ''
}) {
    try {
        return await AuditLog.create({
            actor: actor?._id || actor,
            actorName: actorName || actor?.name || 'System',
            actorRole: actorRole || actor?.role || 'system',
            action,
            targetType,
            targetId: String(targetId || ''),
            details,
            ip
        });
    } catch (err) {
        console.error('[audit] error logging audit:', err.message);
        return null;
    }
}

module.exports = {
    sendNotification,
    recordAuditLog
};
