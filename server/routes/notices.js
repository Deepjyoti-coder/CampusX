const express = require('express');
const Notice = require('../models/Notice');
const User = require('../models/User');
const { protect, authorise } = require('../middleware/auth');
const { sendNotification, recordAuditLog } = require('../utils/notify');
const { runAIAssistant } = require('../utils/aiAssistant');
const router = express.Router();

const PUBLISHER_ROLES = new Set(['admin', 'librarian']);

// Helper to determine if user can publish
function canPublish(user) {
    return PUBLISHER_ROLES.has(user?.role);
}

// GET /api/notices — list notices with audience filtering
router.get('/', async (req, res) => {
    try {
        const view = req.query.view || req.query.scope || 'all';
        const {
            department,
            category,
            priority,
            search,
            saved,
            unread,
            includeArchived = 'false',
            status
        } = req.query;

        // Try getting logged in user from token if available
        let user = null;
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusai_super_secret_key_2026');
                user = await User.findById(decoded.id);
            }
        } catch {}

        const query = {};

        // Status filter
        if (status) {
            query.status = status;
        } else if (includeArchived !== 'true') {
            query.status = 'published';
        }

        const getDeptMatches = (d) => {
            const list = ['University-wide', 'All Departments', 'ALL'];
            if (d) {
                list.push(d);
                const lower = d.toLowerCase();
                if (lower.includes('computer') || lower.includes('cse')) {
                    list.push('CSE', 'CS', 'Computer Science', 'Computer Science and Engineering', 'Computer Science & Engineering');
                }
                if (lower.includes('information') || lower.includes('it')) {
                    list.push('IT', 'Information Technology');
                }
                if (lower.includes('electronic') || lower.includes('ece')) {
                    list.push('ECE', 'EC', 'Electronics', 'Electronics and Communication');
                }
            }
            return [...new Set(list)];
        };

        // View logic
        if (view === 'for_you' && user) {
            const userDept = user.department || 'Computer Science';
            const userYear = user.year || 3;
            const allowedDepts = getDeptMatches(userDept);
            query.$and = [
                {
                    $or: [
                        { departments: { $in: allowedDepts } },
                        { departments: { $size: 0 } },
                        { departments: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { eligibleYears: { $in: [userYear] } },
                        { eligibleYears: { $size: 0 } },
                        { eligibleYears: { $exists: false } }
                    ]
                }
            ];
        } else if (view === 'my_dept' && user) {
            const userDept = user.department || 'Computer Science';
            const allowedDepts = getDeptMatches(userDept).filter(x => !['University-wide', 'All Departments', 'ALL'].includes(x));
            query.departments = { $in: allowedDepts };
        } else if (view === 'university') {
            query.departments = { $in: ['University-wide', 'All Departments', 'ALL'] };
        } else if (department && department !== 'All Departments') {
            query.departments = { $in: [department, 'University-wide', 'All Departments', 'ALL'] };
        }

        // Category filter
        if (category && category !== 'All') {
            query.category = category;
        }

        // Priority filter
        if (priority && priority !== 'All') {
            query.priority = priority.toLowerCase();
        }

        // Saved / Bookmarked filter
        if (saved === 'true' && user) {
            query.savedBy = user._id;
        }

        // Unread filter
        if (unread === 'true' && user) {
            query.readBy = { $ne: user._id };
        }

        // Search filter
        if (search) {
            const s = search.trim();
            query.$or = [
                { title: { $regex: s, $options: 'i' } },
                { content: { $regex: s, $options: 'i' } },
                { publishingDepartment: { $regex: s, $options: 'i' } },
                { category: { $regex: s, $options: 'i' } }
            ];
        }

        const notices = await Notice.find(query)
            .sort({ pinned: -1, publishedAt: -1, createdAt: -1 })
            .populate('createdBy', 'name role department');

        // Augment with isRead and isSaved flags for client
        const result = notices.map(n => {
            const obj = n.toObject();
            obj.isRead = user ? (n.readBy || []).some(id => String(id) === String(user._id)) : false;
            obj.isSaved = user ? (n.savedBy || []).some(id => String(id) === String(user._id)) : false;
            return obj;
        });

        res.json({ success: true, count: result.length, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/notices/:id — single notice with automatic read tracking
router.get('/:id', async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id).populate('createdBy', 'name role department');
        if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

        // If authenticated user views, mark as read
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusai_super_secret_key_2026');
                if (decoded?.id && !notice.readBy.includes(decoded.id)) {
                    notice.readBy.push(decoded.id);
                    await notice.save();
                }
            }
        } catch {}

        res.json({ success: true, data: notice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/notices — create notice (admin / publisher)
router.post('/', protect, async (req, res) => {
    try {
        if (!canPublish(req.user)) {
            return res.status(403).json({ success: false, message: 'Only authorized publishers can create notices' });
        }

        const rawTitle = req.body.title;
        const rawContent = req.body.content || req.body.description;
        if (!rawTitle || !rawContent) {
            return res.status(400).json({ success: false, message: 'Title and content are required' });
        }

        const rawPriority = req.body.priority === 'standard' ? 'normal' : (req.body.priority || 'normal');
        const rawDepartments = req.body.departments || (req.body.department ? [req.body.department] : ['University-wide']);
        const rawYears = req.body.eligibleYears || req.body.targetYears || [];
        const isPinned = Boolean(req.body.pinned ?? req.body.isPinned ?? false);
        const pubDept = req.body.publishingDepartment || req.body.department || req.user.department || 'Administration';
        const extLink = req.body.externalLink || req.body.link || '';
        const regLink = req.body.registrationLink || '';

        const notice = await Notice.create({
            title: rawTitle.trim(),
            content: rawContent.trim(),
            departments: Array.isArray(rawDepartments) ? rawDepartments : [rawDepartments],
            eligibleYears: Array.isArray(rawYears) ? rawYears : [],
            category: req.body.category || 'General announcement',
            priority: rawPriority,
            publishedAt: req.body.publishedAt || new Date(),
            expiresAt: req.body.expiresAt || null,
            publishingDepartment: pubDept,
            authorName: req.user.name,
            attachments: req.body.attachments || [],
            externalLink: extLink,
            registrationLink: regLink,
            status: req.body.status || 'published',
            pinned: isPinned,
            contactInfo: req.body.contactInfo || '',
            icon: req.body.icon || '📢',
            createdBy: req.user._id
        });

        // Audit log
        await recordAuditLog({
            actor: req.user,
            action: 'NOTICE_PUBLISHED',
            targetType: 'Notice',
            targetId: notice._id,
            details: { title: notice.title, priority: notice.priority, departments: notice.departments }
        });

        // Broadcast notification to eligible users if published and high/urgent priority
        if (notice.status === 'published') {
            const targetUsers = await User.find({
                role: 'student',
                ...(notice.departments.includes('University-wide') || notice.departments.includes('All Departments')
                    ? {}
                    : { department: { $in: notice.departments } })
            }).limit(20);

            for (const u of targetUsers) {
                await sendNotification({
                    userId: u._id,
                    title: `📢 ${notice.title}`,
                    message: `${notice.publishingDepartment}: ${notice.content.slice(0, 100)}...`,
                    type: 'notice',
                    priority: notice.priority,
                    linkTab: 'updates',
                    targetId: notice._id
                });
            }
        }

        res.status(201).json({ success: true, data: notice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/notices/:id — edit notice
router.put('/:id', protect, async (req, res) => {
    try {
        if (!canPublish(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to edit notices' });
        }

        const notice = await Notice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user._id },
            { new: true }
        );
        if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

        await recordAuditLog({
            actor: req.user,
            action: 'NOTICE_UPDATED',
            targetType: 'Notice',
            targetId: notice._id,
            details: { title: notice.title }
        });

        res.json({ success: true, data: notice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/notices/:id — archive or remove notice
router.delete('/:id', protect, async (req, res) => {
    try {
        if (!canPublish(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to delete notices' });
        }

        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

        if (req.query.hard === 'true') {
            await notice.deleteOne();
        } else {
            notice.status = 'archived';
            await notice.save();
        }

        await recordAuditLog({
            actor: req.user,
            action: 'NOTICE_ARCHIVED',
            targetType: 'Notice',
            targetId: notice._id
        });

        res.json({ success: true, message: 'Notice archived successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/notices/:id/bookmark — toggle save notice
router.post('/:id/bookmark', protect, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

        const userIdStr = String(req.user._id);
        const index = (notice.savedBy || []).findIndex(id => String(id) === userIdStr);
        let isSaved = false;

        if (index > -1) {
            notice.savedBy.splice(index, 1);
            isSaved = false;
        } else {
            notice.savedBy.push(req.user._id);
            isSaved = true;
        }

        await notice.save();
        res.json({ success: true, isSaved, message: isSaved ? 'Notice bookmarked' : 'Bookmark removed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/notices/:id/read — mark notice as read
router.post('/:id/read', protect, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

        if (!notice.readBy.some(id => String(id) === String(req.user._id))) {
            notice.readBy.push(req.user._id);
            await notice.save();
        }
        res.json({ success: true, isRead: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/notices/ai-assist — AI assistance for drafting & formatting
router.post('/ai-assist', protect, async (req, res) => {
    try {
        const { action = 'generate', text = '', title = '', bullets = '', content = '' } = req.body;
        const normalizedAction = (action === 'bullets_to_notice') ? 'generate' : action;
        const inputText = text || bullets || content;
        const result = await runAIAssistant(normalizedAction, { text: inputText, title });
        res.json({ success: true, data: result, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
