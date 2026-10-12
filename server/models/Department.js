const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    headOfDepartment: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true },
    displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

departmentSchema.index({ isActive: 1, displayOrder: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
