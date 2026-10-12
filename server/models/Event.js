const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    department: { type: String, trim: true },
    year: { type: Number },
    status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
    registeredAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null }
}, { _id: true });

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    organizingDepartment: { type: String, default: 'General', trim: true },
    clubName: { type: String, default: '', trim: true },
    category: {
        type: String,
        default: 'Workshop',
        trim: true
    },
    eventDate: { type: Date, required: true },
    startTime: { type: String, default: '10:00 AM', trim: true },
    endTime: { type: String, default: '12:00 PM', trim: true },
    venue: { type: String, required: true, trim: true },
    isOnline: { type: Boolean, default: false },
    onlineMeetingLink: { type: String, default: '', trim: true },
    organizerName: { type: String, default: 'Event Coordinator', trim: true },
    organizerEmail: { type: String, default: '', trim: true },
    organizerPhone: { type: String, default: '', trim: true },
    registrationDeadline: { type: Date, default: null },
    eligibilityCriteria: { type: String, default: 'Open to all students', trim: true },
    eligibleDepartments: [{ type: String, trim: true }], // empty means all
    eligibleYears: [{ type: Number }], // empty means all
    capacityLimit: { type: Number, default: 0 }, // 0 = unlimited
    posterImage: { type: String, default: '' },
    posterGradient: { type: String, default: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' },
    icon: { type: String, default: '📅' },
    registrationType: { type: String, enum: ['internal', 'external'], default: 'internal' },
    externalRegistrationUrl: { type: String, default: '', trim: true },
    status: {
        type: String,
        default: 'published'
    },
    cancellationReason: { type: String, default: '', trim: true },
    rescheduledDetails: { type: String, default: '', trim: true },
    contactDetails: { type: String, default: '', trim: true },
    publishedAt: { type: Date, default: Date.now },
    registrations: [eventRegistrationSchema],
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

eventSchema.virtual('date').get(function () {
    return this.eventDate;
});
eventSchema.virtual('capacity').get(function () {
    return this.capacityLimit;
});
eventSchema.virtual('department').get(function () {
    return this.organizingDepartment;
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ organizingDepartment: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ 'registrations.user': 1 });

// Helper method to compute dynamic state
eventSchema.methods.computeDynamicState = function () {
    const now = new Date();
    if (this.status === 'cancelled') return 'Cancelled';
    if (this.status === 'rescheduled') return 'Rescheduled';
    if (this.eventDate && this.eventDate < now) return 'Completed';

    const activeCount = (this.registrations || []).filter(r => r.status === 'registered').length;
    if (this.capacityLimit > 0 && activeCount >= this.capacityLimit) {
        return 'Fully Booked';
    }

    if (this.registrationDeadline) {
        if (this.registrationDeadline < now) return 'Registration Closed';
        const hoursLeft = (new Date(this.registrationDeadline) - now) / (1000 * 60 * 60);
        if (hoursLeft <= 48) return 'Registration Closing Soon';
    }

    return 'Registration Open';
};

module.exports = mongoose.model('Event', eventSchema);
