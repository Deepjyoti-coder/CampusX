const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/notifications — get user's notifications + unread count
router.get('/', protect, async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ user: req.user._id })
                .sort({ createdAt: -1 })
                .limit(40),
            Notification.countDocuments({ user: req.user._id, read: false })
        ]);

        res.json({
            success: true,
            unreadCount,
            count: notifications.length,
            data: notifications
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST & PATCH /api/notifications/:id/read — mark single notification as read
router.route('/:id/read').all(protect, async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { read: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
        res.json({ success: true, data: notif });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/notifications/:id — delete a notification
router.delete('/:id', protect, async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
