const express = require('express');
const {
  getAllDoctors,
  getDoctorById,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorSchedule,
  updateDoctorSchedule,
} = require('../controllers/doctor.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// -----------------------------------------------------------------------------
// Doctor Directory & Profiles
// -----------------------------------------------------------------------------

// Public / Patient accessible: Browse all doctors with optional search and filters
router.get('/', getAllDoctors);

// Doctor-only: View and update own doctor profile
// (Defined before /:id to prevent Express route matching conflict)
router.get('/profile', authenticateUser, authorizeRoles('DOCTOR'), getDoctorProfile);
router.put('/profile', authenticateUser, authorizeRoles('DOCTOR'), updateDoctorProfile);

// Doctor-only: Update own working schedule
router.put('/schedule', authenticateUser, authorizeRoles('DOCTOR'), updateDoctorSchedule);

// Public / Patient accessible: View specific doctor schedule
router.get('/:id/schedule', getDoctorSchedule);

// Public / Patient accessible: View single doctor details
router.get('/:id', getDoctorById);

module.exports = router;

