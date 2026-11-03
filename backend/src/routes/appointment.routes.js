const express = require('express');
const {
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getTodayDoctorAppointments,
  cancelAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
} = require('../controllers/appointment.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// -----------------------------------------------------------------------------
// Appointment Slots
// -----------------------------------------------------------------------------
// Get available slots for a doctor on a specific date (Accessible to logged-in users)
router.get('/slots/:doctorId', authenticateUser, getAvailableSlots);

// -----------------------------------------------------------------------------
// Patient Appointment Routes
// -----------------------------------------------------------------------------
// Book a new appointment (PATIENT only)
router.post('/', authenticateUser, authorizeRoles('PATIENT'), bookAppointment);

// View appointments for logged-in patient (PATIENT only)
router.get('/my', authenticateUser, authorizeRoles('PATIENT'), getPatientAppointments);

// -----------------------------------------------------------------------------
// Doctor Appointment Routes
// -----------------------------------------------------------------------------
// View all appointments for logged-in doctor (DOCTOR only)
router.get('/doctor/my', authenticateUser, authorizeRoles('DOCTOR'), getDoctorAppointments);

// View today's appointments for logged-in doctor (DOCTOR only)
router.get('/doctor/today', authenticateUser, authorizeRoles('DOCTOR'), getTodayDoctorAppointments);

// -----------------------------------------------------------------------------
// Appointment Modification Routes
// -----------------------------------------------------------------------------
// Cancel appointment (Patient owner or Doctor owner)
router.put('/:id/cancel', authenticateUser, cancelAppointment);

// Reschedule appointment (Patient owner, Doctor owner, or Admin) — Phase 10
router.put('/:id/reschedule', authenticateUser, rescheduleAppointment);

// Update appointment status (DOCTOR only)
router.put('/:id/status', authenticateUser, authorizeRoles('DOCTOR'), updateAppointmentStatus);

module.exports = router;

