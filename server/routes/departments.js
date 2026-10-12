const express = require('express');
const Department = require('../models/Department');
const { protect, authorise } = require('../middleware/auth');
const { recordAuditLog } = require('../utils/notify');
const router = express.Router();

// GET /api/departments — list departments
router.get('/', async (req, res) => {
    try {
        const includeInactive = req.query.all === 'true';
        const query = includeInactive ? {} : { isActive: true };
        const departments = await Department.find(query).sort({ displayOrder: 1, name: 1 });
        res.json({ success: true, count: departments.length, data: departments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/departments — create department (admin only)
router.post('/', protect, authorise('admin'), async (req, res) => {
    try {
        const { name, code, description, headOfDepartment, contactEmail, displayOrder } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Name and Code are required' });
        }

        const dept = await Department.create({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description?.trim() || '',
            headOfDepartment: headOfDepartment?.trim() || '',
            contactEmail: contactEmail?.trim() || '',
            displayOrder: displayOrder || 0
        });

        await recordAuditLog({
            actor: req.user,
            action: 'DEPARTMENT_CREATED',
            targetType: 'Department',
            targetId: dept._id,
            details: { name: dept.name, code: dept.code }
        });

        res.status(201).json({ success: true, data: dept });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Department with this name or code already exists' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/departments/:id — update department (admin only)
router.put('/:id', protect, authorise('admin'), async (req, res) => {
    try {
        const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

        await recordAuditLog({
            actor: req.user,
            action: 'DEPARTMENT_UPDATED',
            targetType: 'Department',
            targetId: dept._id,
            details: req.body
        });

        res.json({ success: true, data: dept });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/departments/:id — deactivate department (admin only)
router.delete('/:id', protect, authorise('admin'), async (req, res) => {
    try {
        const dept = await Department.findById(req.params.id);
        if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

        dept.isActive = false;
        await dept.save();

        await recordAuditLog({
            actor: req.user,
            action: 'DEPARTMENT_DEACTIVATED',
            targetType: 'Department',
            targetId: dept._id
        });

        res.json({ success: true, message: 'Department deactivated successfully', data: dept });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
