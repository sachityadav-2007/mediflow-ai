const express = require('express');
const {
  joinWaitlist,
  getPatientWaitlist,
  getDoctorWaitlist,
  leaveWaitlist,
  allocateSlot,
} = require('../controllers/waitlist.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// -----------------------------------------------------------------------------
// Patient Waitlist Routes
// -----------------------------------------------------------------------------
// Join doctor's waitlist (PATIENT only)
router.post('/', authenticateUser, authorizeRoles('PATIENT'), joinWaitlist);

// View logged-in patient's waitlist entries (PATIENT only)
router.get('/my', authenticateUser, authorizeRoles('PATIENT'), getPatientWaitlist);

// Leave waitlist (Patient owner or Admin)
router.put('/:id/leave', authenticateUser, leaveWaitlist);

// -----------------------------------------------------------------------------
// Doctor Waitlist Routes
// -----------------------------------------------------------------------------
// View doctor's waitlist ranked by priority score (DOCTOR only)
router.get('/doctor/my', authenticateUser, authorizeRoles('DOCTOR'), getDoctorWaitlist);

// -----------------------------------------------------------------------------
// Smart Allocation Trigger Route
// -----------------------------------------------------------------------------
// Trigger smart allocation of an open slot (ADMIN or DOCTOR for viva demonstration)
router.post('/allocate', authenticateUser, authorizeRoles('ADMIN', 'DOCTOR'), allocateSlot);

module.exports = router;

