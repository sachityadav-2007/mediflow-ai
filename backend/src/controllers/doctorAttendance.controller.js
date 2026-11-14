const doctorAttendanceService = require('../services/doctorAttendanceService');

/**
 * Controller for Doctor QR Attendance & Hospital Presence System
 */

// POST /api/presence/qr/generate (Admin only)
const generateHospitalQR = async (req, res) => {
  try {
    const { location, validityMinutes } = req.body;
    const result = await doctorAttendanceService.generateHospitalQR({
      location,
      validityMinutes,
      adminUser: req.user,
    });
    return res.status(201).json({
      success: true,
      message: `Hospital attendance QR code generated for "${result.location}".`,
      ...result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/presence/qr/revoke (Admin only)
const revokeHospitalQR = async (req, res) => {
  try {
    const { codeId } = req.body;
    const result = await doctorAttendanceService.revokeHospitalQR({
      codeId,
      adminUser: req.user,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/presence/qr/active (Admin only)
const getActiveHospitalQRCodes = async (req, res) => {
  try {
    const qrs = await doctorAttendanceService.getActiveHospitalQRCodes();
    return res.status(200).json({
      success: true,
      count: qrs.length,
      qrCodes: qrs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/presence/qr/check-in (Doctor only)
const processDoctorCheckIn = async (req, res) => {
  try {
    const { token } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await doctorAttendanceService.processDoctorCheckIn({
      token,
      doctorUser: req.user,
      ipAddress,
      userAgent,
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.message.includes('Unauthorized')
      ? 403
      : err.message.includes('Duplicate check-in')
      ? 409
      : err.message.includes('expired')
      ? 410
      : 400;

    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/presence/qr/check-out (Doctor only)
const processDoctorCheckOut = async (req, res) => {
  try {
    const { notes } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await doctorAttendanceService.processDoctorCheckOut({
      doctorUser: req.user,
      notes,
      ipAddress,
      userAgent,
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.message.includes('Unauthorized')
      ? 403
      : err.message.includes('not currently checked in') || err.message.includes('does not have an active')
      ? 404
      : 400;

    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/presence/me (Doctor only)
const getDoctorMyAttendance = async (req, res) => {
  try {
    const result = await doctorAttendanceService.getDoctorMyAttendance(req.user);
    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/presence/history (Admin or Doctor)
const getAttendanceHistory = async (req, res) => {
  try {
    const { doctorId, date, location, page, limit } = req.query;
    const result = await doctorAttendanceService.getAttendanceHistory({
      user: req.user,
      doctorId,
      date,
      location,
      page,
      limit,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/presence/qr/scans (Admin only)
const getQRScanActivity = async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await doctorAttendanceService.getQRScanActivity({ limit });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * GET /api/presence/analytics
 * Summary analytics of doctor presence for administrators
 */
const getPresenceAnalytics = async (req, res) => {
  try {
    const result = await doctorAttendanceService.getPresenceAnalytics();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to retrieve presence analytics.',
    });
  }
};

module.exports = {
  generateHospitalQR,
  revokeHospitalQR,
  getActiveHospitalQRCodes,
  processDoctorCheckIn,
  processDoctorCheckOut,
  getDoctorMyAttendance,
  getAttendanceHistory,
  getQRScanActivity,
  getPresenceAnalytics,
};

