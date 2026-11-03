const express = require('express');
const {
  getDoctorAvailability,
  getAppointmentDemand,
  getWaitingTime,
  getRecommendedSlots,
  getDepartmentForecast,
  getDoctorForecast,
  getAdminAnalytics,
  getAppointmentDuration,
  getModelStatus,
  getAdminModelEvaluation,
} = require('../controllers/ai.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * 1. Predict Doctor Availability Probability
 * GET /api/ai/doctor-availability?doctorId=...&date=YYYY-MM-DD&startTime=HH:MM
 */
router.get('/doctor-availability', authenticateUser, getDoctorAvailability);

/**
 * 2. Forecast Appointment Demand
 * GET /api/ai/appointment-demand?department=...
 */
router.get('/appointment-demand', authenticateUser, getAppointmentDemand);

/**
 * 3. Estimate Patient Waiting Time
 * GET /api/ai/waiting-time?doctorId=...&date=YYYY-MM-DD&startTime=HH:MM
 */
router.get('/waiting-time', authenticateUser, getWaitingTime);

/**
 * 4. Smart Slot Recommendations
 * GET /api/ai/recommended-slots?specialization=...&preferredDate=...&limit=5
 */
router.get('/recommended-slots', authenticateUser, getRecommendedSlots);

/**
 * 5. Department 7-Day Demand Forecast
 * GET /api/ai/forecast/department/:department
 */
router.get('/forecast/department/:department', authenticateUser, getDepartmentForecast);

/**
 * 6. Doctor Schedule & Demand Forecast
 * GET /api/ai/forecast/doctor/:doctorId
 */
router.get('/forecast/doctor/:doctorId', authenticateUser, getDoctorForecast);

/**
 * 7. Hospital Executive AI Analytics (Admin only)
 * GET /api/ai/admin/analytics
 */
router.get(
  '/admin/analytics',
  authenticateUser,
  authorizeRoles('ADMIN'),
  getAdminAnalytics
);

/**
 * 8. Predict Consultation Duration (Advisory ML)
 * GET /api/ai/appointment-duration?doctorId=...&department=...
 */
router.get('/appointment-duration', authenticateUser, getAppointmentDuration);

/**
 * 9. Real-Time Model Operational Status
 * GET /api/ai/model-status
 */
router.get('/model-status', authenticateUser, getModelStatus);

/**
 * 10. ML Model Registry & Evaluation Benchmarks (Admin only)
 * GET /api/ai/admin/evaluation
 */
router.get(
  '/admin/evaluation',
  authenticateUser,
  authorizeRoles('ADMIN'),
  getAdminModelEvaluation
);

module.exports = router;

