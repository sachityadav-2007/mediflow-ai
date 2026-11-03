const express = require('express');
const {
  getAppointmentQR,
  processCheckIn,
  getLiveQueue,
  updateConsultationStatus,
  triggerUpcomingReminders,
} = require('../controllers/checkIn.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// Generate or view QR code for an appointment
router.get('/appointment/:id/qr', authenticateUser, getAppointmentQR);

// Process check-in (Scanner / Reception / Patient kiosk)
router.post('/scan', authenticateUser, processCheckIn);

// Live Queue for doctor OPD (public display screen support)
router.get('/queue/:doctorId', getLiveQueue);

// Update consultation state (DOCTOR or ADMIN only: START, COMPLETE, NO_SHOW)
router.put(
  '/queue/consultation/:id',
  authenticateUser,
  authorizeRoles('DOCTOR', 'ADMIN'),
  updateConsultationStatus
);

// Trigger scheduled email reminders (ADMIN only)
router.post(
  '/reminders/send',
  authenticateUser,
  authorizeRoles('ADMIN'),
  triggerUpcomingReminders
);

module.exports = router;

