const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * Admin Routes — MediFlow AI Phase 8
 * Base URL: /api/admin
 * Strict security guard: All routes require authentication and ADMIN role.
 */
router.use(authenticateUser, authorizeRoles('ADMIN'));

// 1. Hospital-wide statistics
router.get('/stats', adminController.getStats);

// 2. Doctor management and inspection
router.get('/doctors', adminController.getDoctors);
router.get('/doctors/:id', adminController.getDoctorDetails);

// 3. Patient management
router.get('/patients', adminController.getPatients);

// 4. Appointment monitoring with filters
router.get('/appointments', adminController.getAppointments);

// 5. Smart waitlist triage monitoring
router.get('/waitlist', adminController.getWaitlist);

module.exports = router;

