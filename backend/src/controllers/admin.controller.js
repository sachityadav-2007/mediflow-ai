const adminService = require('../services/admin.service');

/**
 * Admin Controller — MediFlow AI Phase 8
 * Directs incoming HTTP requests for Admin analytics, doctor/patient directories,
 * appointment monitoring, and waitlist tracking.
 */

/**
 * GET /api/admin/stats
 * Get hospital-wide real-time operational statistics
 */
const getStats = async (req, res) => {
  try {
    const stats = await adminService.getHospitalStats();
    return res.status(200).json({
      success: true,
      message: 'Hospital statistics retrieved successfully.',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve hospital statistics.',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/doctors
 * Get full list of doctors with presence and workload
 */
const getDoctors = async (req, res) => {
  try {
    const doctors = await adminService.getAllDoctors();
    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error('Error fetching doctors for admin:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctors list.',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/doctors/:id
 * Get detailed doctor profile, schedule, presence log, and recent appointments
 */
const getDoctorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required.',
      });
    }

    const doctor = await adminService.getDoctorDetails(id);
    return res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error('Error fetching doctor details for admin:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve doctor details.',
    });
  }
};

/**
 * GET /api/admin/patients
 * Get registered patients directory with appointment count & active waitlist status
 */
const getPatients = async (req, res) => {
  try {
    const patients = await adminService.getAllPatients();
    return res.status(200).json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error('Error fetching patients for admin:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patients list.',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/appointments
 * Get all hospital appointments with optional status, doctor, and date filters
 */
const getAppointments = async (req, res) => {
  try {
    const { status, doctorId, date } = req.query;
    const appointments = await adminService.getAllAppointments({
      status,
      doctorId,
      date,
    });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error('Error fetching appointments for admin:', error.message);
    const statusCode =
      error.message.includes('Invalid status') || error.message.includes('Date must be')
        ? 400
        : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve appointments.',
    });
  }
};

/**
 * GET /api/admin/waitlist
 * Get hospital waitlist entries ranked by priority score
 */
const getWaitlist = async (req, res) => {
  try {
    const { status, doctorId } = req.query;
    const waitlist = await adminService.getWaitlistEntries({
      status,
      doctorId,
    });

    return res.status(200).json({
      success: true,
      count: waitlist.length,
      data: waitlist,
    });
  } catch (error) {
    console.error('Error fetching waitlist for admin:', error.message);
    const statusCode = error.message.includes('Invalid waitlist status') ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve waitlist entries.',
    });
  }
};

module.exports = {
  getStats,
  getDoctors,
  getDoctorDetails,
  getPatients,
  getAppointments,
  getWaitlist,
};

