const express = require('express');
const {
  getAllPresences,
  getDoctorPresence,
  updateDoctorPresence,
} = require('../controllers/doctor.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// -----------------------------------------------------------------------------
// Doctor Presence Management
// -----------------------------------------------------------------------------

// Public / Patient accessible: View current presence of all doctors
router.get('/', getAllPresences);

// Doctor-only: Update own presence status and log audit record
// (Defined before /:doctorId to prevent Express route matching conflict)
router.put('/status', authenticateUser, authorizeRoles('DOCTOR'), updateDoctorPresence);

// Public / Patient accessible: View specific doctor presence and history
router.get('/:doctorId', getDoctorPresence);

module.exports = router;

