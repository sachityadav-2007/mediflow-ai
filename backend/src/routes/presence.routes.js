const express = require('express');
const {
  getAllPresences,
  getDoctorPresence,
  updateDoctorPresence,
} = require('../controllers/doctor.controller');
const {
  generateHospitalQR,
  revokeHospitalQR,
  getActiveHospitalQRCodes,
  processDoctorCheckIn,
  processDoctorCheckOut,
  getDoctorMyAttendance,
  getAttendanceHistory,
  getQRScanActivity,
} = require('../controllers/doctorAttendance.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');
const { qrAttendanceLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// -----------------------------------------------------------------------------
// Doctor QR Attendance & Hospital Presence Management
// -----------------------------------------------------------------------------

// Admin: Generate new hospital attendance QR code
router.post('/qr/generate', authenticateUser, authorizeRoles('ADMIN'), generateHospitalQR);

// Admin: Revoke hospital attendance QR code
router.post('/qr/revoke', authenticateUser, authorizeRoles('ADMIN'), revokeHospitalQR);

// Admin: List active hospital attendance QR codes
router.get('/qr/active', authenticateUser, authorizeRoles('ADMIN'), getActiveHospitalQRCodes);

// Admin: View all QR scan audit logs (success, expired, rejected, unauthorized)
router.get('/qr/scans', authenticateUser, authorizeRoles('ADMIN'), getQRScanActivity);

// Doctor: Scan hospital QR code and check in (Rate-limited, strictly role-enforced)
router.post(
  '/qr/check-in',
  authenticateUser,
  authorizeRoles('DOCTOR'),
  qrAttendanceLimiter,
  processDoctorCheckIn
);

// Doctor: Check out of hospital attendance
router.post(
  '/qr/check-out',
  authenticateUser,
  authorizeRoles('DOCTOR'),
  qrAttendanceLimiter,
  processDoctorCheckOut
);

// Doctor: View current attendance status, active session, and today's working hours
router.get('/me', authenticateUser, authorizeRoles('DOCTOR'), getDoctorMyAttendance);

// Admin or Doctor: View attendance history (Admin views hospital-wide; Doctor views own)
router.get(
  '/history',
  authenticateUser,
  authorizeRoles('ADMIN', 'DOCTOR'),
  getAttendanceHistory
);

// -----------------------------------------------------------------------------
// Legacy & Direct Presence Routes (Preserved)
// -----------------------------------------------------------------------------

// Doctor: Direct status toggle
router.put('/status', authenticateUser, authorizeRoles('DOCTOR'), updateDoctorPresence);

// Public / Patient accessible: View current presence of all doctors
router.get('/', getAllPresences);

// Public / Patient accessible: View specific doctor presence
router.get('/:doctorId', getDoctorPresence);

module.exports = router;
