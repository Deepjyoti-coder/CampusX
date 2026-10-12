const express = require('express');
const multer = require('multer');
const path = require('node:path');
const mongoose = require('mongoose');
const LostFound = require('../models/LostFound');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { emitRealtime } = require('../realtime');
const { sendNotification, recordAuditLog } = require('../utils/notify');
const { calculateMatchScore } = require('../utils/itemMatcher');
const router = express.Router();

const MODERATOR_ROLES = new Set(['admin', 'librarian']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `lostfound_${req.user._id}_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) return cb(null, true);
        cb(new Error('Only jpeg, png, or webp images are allowed'));
    }
});

function isModerator(user) {
    return MODERATOR_ROLES.has(user?.role);
}

function sanitizeItemForPublic(item, currentUser) {
    const obj = item.toObject ? item.toObject() : { ...item };
    const isOwner = currentUser && String(item.reportedBy?._id || item.reportedBy) === String(currentUser._id);
    const isStaff = isModerator(currentUser);

    // If sensitive item and not owner/staff, redact identifying features
    if (obj.isSensitive && !isOwner && !isStaff) {
        obj.identifyingFeatures = '🔒 Redacted for security & privacy. Please verify at Campus Security Desk.';
        obj.description = obj.description ? `${obj.description.slice(0, 80)}... [Details hidden for owner verification]` : '';
    }

    // Hide claims proof from public
    if (!isOwner && !isStaff) {
        obj.claims = (obj.claims || []).map(c => ({
            _id: c._id,
            status: c.status,
            submittedAt: c.submittedAt
        }));
    }

    return obj;
}

// GET /api/lostfound — search and feed
router.get('/', async (req, res) => {
    try {
        const {
            type, // 'lost' | 'found'
            category,
            location,
            status,
            my_reports = 'false',
            search,
            page = 1,
            limit = 30
        } = req.query;

        let currentUser = null;
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusai_super_secret_key_2026');
                currentUser = await User.findById(decoded.id);
            }
        } catch {}

        const query = {
            'moderation.hidden': { $ne: true }
        };

        if (type && ['lost', 'found'].includes(type.toLowerCase())) {
            query.type = type.toLowerCase();
        }

        if (category && category !== 'All Categories') {
            query.category = category;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (location) {
            query.location = { $regex: location.trim(), $options: 'i' };
        }

        if (my_reports === 'true' && currentUser) {
            query.reportedBy = currentUser._id;
        }

        if (search) {
            const s = search.trim();
            query.$or = [
                { name: { $regex: s, $options: 'i' } },
                { location: { $regex: s, $options: 'i' } },
                { description: { $regex: s, $options: 'i' } },
                { color: { $regex: s, $options: 'i' } },
                { category: { $regex: s, $options: 'i' } }
            ];
        }

        const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);
        const [items, total] = await Promise.all([
            LostFound.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('reportedBy', 'name role avatar')
                .populate('claims.claimant', 'name email role'),
            LostFound.countDocuments(query)
        ]);

        const sanitized = items.map(item => sanitizeItemForPublic(item, currentUser));

        res.json({
            success: true,
            count: sanitized.length,
            total,
            data: sanitized
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/lostfound/:id — single item details
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }

        let currentUser = null;
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusai_super_secret_key_2026');
                currentUser = await User.findById(decoded.id);
            }
        } catch {}

        const item = await LostFound.findById(req.params.id)
            .populate('reportedBy', 'name role avatar email')
            .populate('claims.claimant', 'name email role')
            .populate('claims.reviewedBy', 'name role');

        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        res.json({ success: true, data: sanitizeItemForPublic(item, currentUser) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/lostfound/:id/matches — AI-powered potential match detection
router.get('/:id/matches', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }

        const target = await LostFound.findById(req.params.id);
        if (!target) return res.status(404).json({ success: false, message: 'Item not found' });

        // Search candidate items of opposite type
        const oppositeType = target.type === 'lost' ? 'found' : 'lost';
        const candidates = await LostFound.find({
            type: oppositeType,
            status: { $in: ['open', 'potential_match', 'claim_pending'] },
            'moderation.hidden': { $ne: true }
        }).populate('reportedBy', 'name role avatar');

        const scoredMatches = [];
        for (const candidate of candidates) {
            const matchResult = await calculateMatchScore(target, candidate);
            if (matchResult.score >= 35) { // Threshold for potential match
                scoredMatches.push({
                    ...matchResult,
                    matchScore: matchResult.score
                });
            }
        }

        // Sort by score descending
        scoredMatches.sort((a, b) => b.score - a.score);

        res.json({
            success: true,
            targetItem: { id: target._id, name: target.name, type: target.type },
            count: scoredMatches.length,
            matches: scoredMatches
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lostfound — report lost or found item
router.post('/', protect, upload.array('images', 3), async (req, res) => {
    try {
        const {
            name,
            type = 'lost',
            category = 'Electronics',
            location = '',
            campusZone = 'General Campus',
            dateOccurred,
            approxDate,
            date,
            timeApprox = '',
            description = '',
            color = '',
            identifyingFeatures = '',
            icon = '📦',
            holdingLocation = 'With Reporter',
            handedToSecurity = false,
            isSensitive = false,
            secretIdentifyingDetails = '',
            secretProof = '',
            contactPreference = 'in_app',
            contactPhone = ''
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Item name is required' });
        }

        const images = (req.files || []).map(f => `/uploads/${f.filename}`);
        const finalDate = dateOccurred || approxDate || date || new Date();
        const finalSecret = secretIdentifyingDetails || secretProof || '';
        const isSens = String(isSensitive) === 'true' || isSensitive === true || category.toLowerCase().includes('id') || category.toLowerCase().includes('wallet');

        const item = await LostFound.create({
            name: name.trim(),
            type: ['lost', 'found'].includes(type?.toLowerCase()) ? type.toLowerCase() : 'lost',
            category: category.trim(),
            location: location.trim(),
            campusZone,
            dateOccurred: new Date(finalDate),
            timeApprox,
            description: description.trim(),
            color: color.trim(),
            identifyingFeatures: identifyingFeatures.trim(),
            icon: icon || (type === 'found' ? '✨' : '🔍'),
            images,
            holdingLocation: holdingLocation.trim(),
            handedToSecurity: String(handedToSecurity) === 'true' || handedToSecurity === true,
            isSensitive: isSens,
            secretIdentifyingDetails: finalSecret.trim(),
            contactPreference: contactPreference.trim(),
            contactPhone,
            reportedBy: req.user._id,
            status: 'open'
        });

        // Trigger automatic match check in background
        const oppositeType = item.type === 'lost' ? 'found' : 'lost';
        const candidates = await LostFound.find({
            type: oppositeType,
            status: { $in: ['open', 'potential_match'] }
        });

        let topMatch = null;
        for (const candidate of candidates) {
            const evalResult = await calculateMatchScore(item, candidate);
            if (evalResult.score >= 60 && (!topMatch || evalResult.score > topMatch.score)) {
                topMatch = { ...evalResult, candidate };
            }
        }

        if (topMatch) {
            item.status = 'potential_match';
            item.matchedItemId = topMatch.candidate._id;
            await item.save();

            topMatch.candidate.status = 'potential_match';
            topMatch.candidate.matchedItemId = item._id;
            await topMatch.candidate.save();

            // Notify owner of lost item
            const lostUserId = item.type === 'lost' ? item.reportedBy : topMatch.candidate.reportedBy;
            await sendNotification({
                userId: lostUserId,
                title: `✨ Potential Match Detected! (${topMatch.score}%)`,
                message: `We found a potential match for your reported item: "${item.name}". Check Lost & Found to review details and claim!`,
                type: 'lostfound',
                priority: 'high',
                linkTab: 'lostfound',
                targetId: item._id
            });
        }

        emitRealtime('lostfound:item:created', {
            item,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lostfound/:id/claim — submit ownership claim
router.post('/:id/claim', protect, async (req, res) => {
    try {
        const { proofDetails, contactInfo } = req.body;
        if (!proofDetails || !proofDetails.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide identifying proof details (e.g., serial number, distinctive marks, wallpapers, contents) to verify ownership.'
            });
        }

        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        if (String(item.reportedBy) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot submit a claim on your own report' });
        }

        // Add claim
        item.claims.push({
            claimant: req.user._id,
            proofDetails: proofDetails.trim(),
            contactInfo: contactInfo?.trim() || req.user.email,
            status: 'pending',
            submittedAt: new Date()
        });

        item.status = 'claim_pending';
        await item.save();

        // Notify item finder / reporter
        await sendNotification({
            userId: item.reportedBy,
            title: `📝 Ownership Claim Submitted: ${item.name}`,
            message: `${req.user.name} has submitted an ownership claim with verification details. Please review or coordinate collection with Campus Security.`,
            type: 'claim',
            priority: 'high',
            linkTab: 'lostfound',
            targetId: item._id
        });

        res.status(201).json({
            success: true,
            message: 'Claim submitted successfully! Campus Security and the finder will verify your details.',
            data: item
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lostfound/:id/claims/:claimId/review — review ownership claim
router.post('/:id/claims/:claimId/review', protect, async (req, res) => {
    try {
        const { action, reviewNotes } = req.body; // 'approve' | 'reject'
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
        }

        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const isOwner = String(item.reportedBy) === String(req.user._id);
        if (!isOwner && !isModerator(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to review this claim' });
        }

        const claim = item.claims.id(req.params.claimId);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

        claim.status = action === 'approve' ? 'approved' : 'rejected';
        claim.reviewedBy = req.user._id;
        claim.reviewedAt = new Date();
        claim.reviewNotes = reviewNotes?.trim() || '';

        if (action === 'approve') {
            item.status = 'returned';
            item.returnedAt = new Date();
        } else {
            // Check if any pending claims remain
            const hasOtherPending = item.claims.some(c => c.status === 'pending');
            item.status = hasOtherPending ? 'claim_pending' : 'open';
        }

        await item.save();

        // Notify claimant
        await sendNotification({
            userId: claim.claimant,
            title: action === 'approve' ? `✅ Claim Approved: ${item.name}` : `❌ Claim Update: ${item.name}`,
            message: action === 'approve'
                ? `Your claim for "${item.name}" was approved! Please collect it at: ${item.holdingLocation || 'Campus Security Desk'}.`
                : `Your claim was reviewed. Note: ${claim.reviewNotes || 'Verification details did not match.'}`,
            type: 'claim',
            priority: 'high',
            linkTab: 'lostfound',
            targetId: item._id
        });

        await recordAuditLog({
            actor: req.user,
            action: action === 'approve' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
            targetType: 'LostFound',
            targetId: item._id,
            details: { claimId: claim._id, notes: claim.reviewNotes }
        });

        res.json({ success: true, message: `Claim ${action}d successfully!`, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/lostfound/:id/report-abuse — flag inappropriate or fraudulent listing
router.post('/:id/report-abuse', protect, async (req, res) => {
    try {
        const { reason } = req.body;
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        item.moderation.flagged = true;
        item.moderation.flagReason = reason?.trim() || 'Flagged by user for review';
        await item.save();

        res.json({ success: true, message: 'Report submitted. Campus moderators will review.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/lostfound/:id/status — status change (returned, closed, open)
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const isOwner = String(item.reportedBy) === String(req.user._id);
        if (!isOwner && !isModerator(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to change status' });
        }

        item.status = status;
        if (status === 'returned') item.returnedAt = new Date();
        await item.save();

        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/lostfound/admin/moderation — admin review list
router.get('/admin/moderation', protect, async (req, res) => {
    try {
        if (!isModerator(req.user)) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const items = await LostFound.find({})
            .sort({ 'moderation.flagged': -1, createdAt: -1 })
            .populate('reportedBy', 'name email role')
            .populate('claims.claimant', 'name email role');

        res.json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/lostfound/admin/moderation/:id — admin moderate action
router.patch('/admin/moderation/:id', protect, async (req, res) => {
    try {
        if (!isModerator(req.user)) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const { hide, receivedBySecurity, notes } = req.body;
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        if (typeof hide === 'boolean') {
            item.moderation.hidden = hide;
        }
        if (receivedBySecurity) {
            item.handedToSecurity = true;
            item.holdingLocation = 'Campus Security Central Office Room 104';
            item.handedOverToSecurityAt = new Date();
        }
        item.moderation.moderatedBy = req.user._id;
        item.moderation.moderatedAt = new Date();
        if (notes) item.moderation.notes = notes;

        await item.save();

        await recordAuditLog({
            actor: req.user,
            action: 'ITEM_MODERATED',
            targetType: 'LostFound',
            targetId: item._id,
            details: { hide, receivedBySecurity, notes }
        });

        res.json({ success: true, message: 'Moderation applied', data: item });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
