const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, authorise } = require('../middleware/auth');
const { sendNotification, recordAuditLog } = require('../utils/notify');
const { runAIAssistant } = require('../utils/aiAssistant');
const router = express.Router();

const PUBLISHER_ROLES = new Set(['admin', 'librarian']);

function canPublish(user) {
    return PUBLISHER_ROLES.has(user?.role);
}

// GET /api/events — list events with filters
router.get('/', async (req, res) => {
    try {
        const {
            department,
            category,
            status,
            upcoming = 'false',
            registered = 'false',
            saved = 'false',
            search
        } = req.query;

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

        if (status) {
            query.status = status;
        } else {
            query.status = { $ne: 'draft' };
        }

        if (upcoming === 'true') {
            query.eventDate = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
        }

        if (department && department !== 'All Departments') {
            query.organizingDepartment = { $in: [department, 'General', 'University-wide'] };
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        if (saved === 'true' && user) {
            query.savedBy = user._id;
        }

        if (registered === 'true' && user) {
            query['registrations.user'] = user._id;
            query['registrations.status'] = 'registered';
        }

        if (search) {
            const s = search.trim();
            query.$or = [
                { title: { $regex: s, $options: 'i' } },
                { description: { $regex: s, $options: 'i' } },
                { venue: { $regex: s, $options: 'i' } },
                { clubName: { $regex: s, $options: 'i' } },
                { organizingDepartment: { $regex: s, $options: 'i' } }
            ];
        }

        const events = await Event.find(query)
            .sort({ eventDate: 1, createdAt: -1 })
            .populate('createdBy', 'name role');

        const result = events.map(e => {
            const obj = e.toObject();
            obj.computedState = e.computeDynamicState();
            obj.activeRegistrationsCount = (e.registrations || []).filter(r => r.status === 'registered').length;
            obj.isRegistered = user
                ? (e.registrations || []).some(r => String(r.user) === String(user._id) && r.status === 'registered')
                : false;
            obj.isSaved = user
                ? (e.savedBy || []).some(id => String(id) === String(user._id))
                : false;
            return obj;
        });

        res.json({ success: true, count: result.length, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/events/:id — event details
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('createdBy', 'name role');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const obj = event.toObject();
        obj.computedState = event.computeDynamicState();
        obj.activeRegistrationsCount = (event.registrations || []).filter(r => r.status === 'registered').length;
        res.json({ success: true, data: obj });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/events — create event
router.post('/', protect, async (req, res) => {
    try {
        if (!canPublish(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to publish events' });
        }

        const rawTitle = req.body.title;
        const rawDesc = req.body.description;
        const rawVenue = req.body.venue;
        const rawDate = req.body.eventDate || req.body.date;

        if (!rawTitle || !rawDesc || !rawVenue || !rawDate) {
            return res.status(400).json({ success: false, message: 'Title, description, venue, and event date are required' });
        }

        const orgDept = req.body.organizingDepartment || req.body.department || 'General';
        const capLimit = Number(req.body.capacityLimit ?? req.body.capacity ?? 0);
        const elig = req.body.eligibilityCriteria || req.body.eligibility || 'Open to all students';
        const poster = req.body.posterImage || req.body.posterUrl || '';
        const regDeadline = req.body.registrationDeadline || req.body.deadline || null;

        const event = await Event.create({
            title: rawTitle.trim(),
            description: rawDesc.trim(),
            organizingDepartment: orgDept.trim(),
            clubName: req.body.clubName || '',
            category: req.body.category || 'Workshop',
            eventDate: new Date(rawDate),
            startTime: req.body.startTime || '10:00 AM',
            endTime: req.body.endTime || '12:00 PM',
            venue: rawVenue.trim(),
            isOnline: Boolean(req.body.isOnline),
            onlineMeetingLink: req.body.onlineMeetingLink || '',
            organizerName: req.body.organizerName || req.user.name,
            organizerEmail: req.body.organizerEmail || req.user.email,
            organizerPhone: req.body.organizerPhone || '',
            registrationDeadline: regDeadline ? new Date(regDeadline) : null,
            eligibilityCriteria: elig,
            eligibleDepartments: req.body.eligibleDepartments || [],
            eligibleYears: req.body.eligibleYears || [],
            capacityLimit: capLimit,
            posterImage: poster,
            posterGradient: req.body.posterGradient || 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            icon: req.body.icon || '📅',
            registrationType: req.body.registrationType || 'internal',
            externalRegistrationUrl: req.body.externalRegistrationUrl || '',
            status: req.body.status || 'published',
            contactDetails: req.body.contactDetails || '',
        });

        await recordAuditLog({
            actor: req.user,
            action: 'EVENT_PUBLISHED',
            targetType: 'Event',
            targetId: event._id,
            details: { title: event.title, eventDate: event.eventDate }
        });

        res.status(201).json({ success: true, data: event });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/events/:id/register — internal event registration
router.post('/:id/register', protect, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (event.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'This event has been cancelled' });
        }

        // Check registration deadline
        if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
        }

        // Check duplicate registration
        const userIdStr = String(req.user._id);
        const existing = (event.registrations || []).find(r => String(r.user) === userIdStr);
        if (existing && existing.status === 'registered') {
            return res.status(400).json({ success: false, message: 'You are already registered for this event' });
        }

        // Check capacity limit
        const activeCount = (event.registrations || []).filter(r => r.status === 'registered').length;
        if (event.capacityLimit > 0 && activeCount >= event.capacityLimit) {
            return res.status(400).json({ success: false, message: 'This event is fully booked' });
        }

        // Check eligibility by year or dept if strictly restricted
        if (event.eligibleYears?.length && req.user.year && !event.eligibleYears.includes(req.user.year)) {
            return res.status(403).json({ success: false, message: `This event is restricted to Year ${event.eligibleYears.join(', ')} students` });
        }

        if (existing) {
            existing.status = 'registered';
            existing.registeredAt = new Date();
            existing.cancelledAt = null;
        } else {
            event.registrations.push({
                user: req.user._id,
                name: req.user.name,
                email: req.user.email,
                department: req.user.department || 'Student',
                year: req.user.year || 1,
                status: 'registered',
                registeredAt: new Date()
            });
        }

        await event.save();

        // Send confirmation notification
        await sendNotification({
            userId: req.user._id,
            title: `🎟️ Registered: ${event.title}`,
            message: `You are confirmed for ${event.title} on ${new Date(event.eventDate).toLocaleDateString()} at ${event.venue}.`,
            type: 'event',
            linkTab: 'updates',
            targetId: event._id
        });

        res.json({
            success: true,
            message: 'Successfully registered for event!',
            data: {
                eventId: event._id,
                status: 'registered',
                eventTitle: event.title,
                venue: event.venue
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/events/:id/register — cancel registration (RESTful)
router.delete('/:id/register', protect, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const userIdStr = String(req.user._id);
        const registration = (event.registrations || []).find(r => String(r.user) === userIdStr && r.status === 'registered');
        if (!registration) {
            return res.status(400).json({ success: false, message: 'You have no active registration for this event' });
        }

        registration.status = 'cancelled';
        registration.cancelledAt = new Date();
        await event.save();

        res.json({ success: true, message: 'Registration cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/events/:id/calendar — export event as iCal (.ics)
router.get(['/:id/calendar', '/:id/ical'], async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).send('Event not found');

        const formatDate = (d) => {
            if (!d) return '20261015T100000Z';
            return new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const dtStart = formatDate(event.eventDate);
        const dtEnd = formatDate(new Date(new Date(event.eventDate).getTime() + 2 * 60 * 60 * 1000));
        const dtStamp = formatDate(new Date());

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//CampusAI//Event Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:event-${event._id}@campusai.edu`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
            `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
            `LOCATION:${(event.venue || 'Campus').replace(/\n/g, ' ')}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="event-${event._id}.ics"`);
        res.send(icsContent);
    } catch (err) {
        res.status(500).send('Error generating calendar file: ' + err.message);
    }
});

// POST /api/events/:id/bookmark — toggle save event
router.post('/:id/bookmark', protect, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const userIdStr = String(req.user._id);
        const index = (event.savedBy || []).findIndex(id => String(id) === userIdStr);
        let isSaved = false;

        if (index > -1) {
            event.savedBy.splice(index, 1);
            isSaved = false;
        } else {
            event.savedBy.push(req.user._id);
            isSaved = true;
        }

        await event.save();
        res.json({ success: true, isSaved, message: isSaved ? 'Event saved' : 'Event removed from saved' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/events/:id/reschedule — reschedule event with notification
router.post('/:id/reschedule', protect, async (req, res) => {
    try {
        if (!canPublish(req.user)) {
            return res.status(403).json({ success: false, message: 'Not authorised to reschedule events' });
        }

        const { newDate, newStartTime, newEndTime, newVenue, reason } = req.body;
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (newDate) event.eventDate = new Date(newDate);
        if (newStartTime) event.startTime = newStartTime;
        if (newEndTime) event.endTime = newEndTime;
        if (newVenue) event.venue = newVenue;
        event.status = 'rescheduled';
        event.rescheduledDetails = `Rescheduled to ${newDate || event.eventDate.toISOString().slice(0, 10)} (${newStartTime || event.startTime}). Reason: ${reason || 'Schedule adjustment'}`;

        await event.save();

        // Notify all registered users
        const activeUsers = (event.registrations || []).filter(r => r.status === 'registered');
        for (const reg of activeUsers) {
            await sendNotification({
                userId: reg.user,
                title: `⚠️ Rescheduled: ${event.title}`,
                message: `Event rescheduled to ${new Date(event.eventDate).toLocaleDateString()} at ${event.startTime}. Venue: ${event.venue}.`,
                type: 'event',
                priority: 'high',
                linkTab: 'updates',
                targetId: event._id
            });
        }

        await recordAuditLog({
            actor: req.user,
            action: 'EVENT_RESCHEDULED',
            targetType: 'Event',
            targetId: event._id,
            details: { newDate, newVenue, reason }
        });

        res.json({ success: true, message: 'Event rescheduled and registered attendees notified', data: event });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/events/:id/calendar.ics — download iCal calendar file
router.get('/:id/calendar.ics', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).send('Event not found');

        const d = new Date(event.eventDate);
        const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const startStr = formatICSDate(d);
        const endStr = formatICSDate(new Date(d.getTime() + 2 * 60 * 60 * 1000));

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//CampusAI//Campus Events//EN',
            'BEGIN:VEVENT',
            `UID:event-${event._id}@campusai.edu`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART:${startStr}`,
            `DTEND:${endStr}`,
            `SUMMARY:${event.title.replace(/[,;]/g, '')}`,
            `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
            `LOCATION:${(event.venue || '').replace(/[,;]/g, '')}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="event-${event._id}.ics"`);
        res.send(icsContent);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST /api/events/ai-assist — AI assistance for event writing
router.post('/ai-assist', protect, async (req, res) => {
    try {
        const { action = 'event_description', text = '', title = '', eventData } = req.body;
        const normalizedAction = (action === 'generate_event') ? 'event_description' : action;
        const inputTitle = title || eventData?.title || '';
        const inputText = text || eventData?.description || eventData?.category || '';
        const result = await runAIAssistant(normalizedAction, { text: inputText, title: inputTitle });
        res.json({ success: true, data: result, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
