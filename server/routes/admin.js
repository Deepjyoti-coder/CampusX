const express = require('express');
const User = require('../models/User');
const Book = require('../models/Book');
const Borrow = require('../models/Borrow');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Event = require('../models/Event');
const LostFound = require('../models/LostFound');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// GET /api/admin/stats — live dashboard metrics
router.get('/stats', protect, authorise('admin'), async (req, res) => {
    try {
        const [
            totalStudents,
            totalAlumni,
            totalBooks,
            activeLoans,
            overdueLoans,
            totalNotices,
            totalEvents,
            totalLostFound,
            totalDepartments
        ] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'alumni' }),
            Book.countDocuments(),
            Borrow.countDocuments({ status: 'active' }),
            Borrow.countDocuments({ status: 'overdue' }),
            Notice.countDocuments({ status: 'published' }),
            Event.countDocuments({ status: 'published' }),
            LostFound.countDocuments({ 'moderation.hidden': { $ne: true } }),
            Department.countDocuments({ isActive: true })
        ]);

        // Overall attendance percentage
        const attAgg = await Attendance.aggregate([
            { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } }
        ]);
        const attendancePct = attAgg.length > 0 ? Math.round((attAgg[0].present / attAgg[0].total) * 100) : 0;

        res.json({
            success: true,
            data: {
                totalStudents,
                totalAlumni,
                totalBooks,
                activeLoans,
                overdueLoans,
                totalNotices,
                totalEvents,
                totalLostFound,
                totalDepartments,
                attendancePct
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/audit-logs — audit logs list
router.get('/audit-logs', protect, authorise('admin'), async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/users — list all users
router.get('/users', protect, authorise('admin'), async (req, res) => {
    try {
        const { role } = req.query;
        const q = role ? { role } : {};
        const users = await User.find(q).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/users/:id — admin update user
router.put('/users/:id', protect, authorise('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, authorise('admin'), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
