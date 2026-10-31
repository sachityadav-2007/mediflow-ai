const doctorService = require('../services/doctor.service');
const prisma = require('../config/db');

/**
 * GET /api/doctors
 * Browse doctor directory with search and specialization filter
 */
const getAllDoctors = async (req, res) => {
  try {
    const { search, specialization } = req.query;
    const doctors = await doctorService.getAllDoctors({ search, specialization });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctors directory.',
    });
  }
};

/**
 * GET /api/doctors/:id
 * Retrieve details of a single doctor
 */
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await doctorService.getDoctorById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctor details.',
    });
  }
};

/**
 * GET /api/doctors/profile
 * Get authenticated doctor's own profile
 */
const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorProfileByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found for this account.',
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctor profile.',
    });
  }
};

/**
 * PUT /api/doctors/profile
 * Update authenticated doctor's own profile
 */
const updateDoctorProfile = async (req, res) => {
  try {
    const doctor = await doctorService.updateDoctorProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully.',
      doctor,
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update doctor profile.',
    });
  }
};

/**
 * GET /api/doctors/:id/schedule
 * Get working schedule for a specific doctor
 */
const getDoctorSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedules = await doctorService.getDoctorSchedule(id);

    return res.status(200).json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctor schedule.',
    });
  }
};

/**
 * PUT /api/doctors/schedule
 * Update authenticated doctor's working schedule
 */
const updateDoctorSchedule = async (req, res) => {
  try {
    // 1. Verify authenticated user is a DOCTOR and resolve their doctor ID
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: 'Only registered doctors can modify schedules.',
      });
    }

    const { schedules, consultationDuration } = req.body;
    const updatedSchedules = await doctorService.updateDoctorSchedule(
      doctor.id,
      schedules,
      consultationDuration
    );

    return res.status(200).json({
      success: true,
      message: 'Doctor schedule updated successfully.',
      schedules: updatedSchedules,
    });
  } catch (error) {
    console.error('Error updating doctor schedule:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update doctor schedule.',
    });
  }
};

/**
 * GET /api/presence
 * List current presence status of all doctors
 */
const getAllPresences = async (req, res) => {
  try {
    const presences = await doctorService.getAllPresences();

    return res.status(200).json({
      success: true,
      count: presences.length,
      presences,
    });
  } catch (error) {
    console.error('Error fetching presences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctor presences.',
    });
  }
};

/**
 * GET /api/presence/:doctorId
 * Get presence details and recent presence history for a specific doctor
 */
const getDoctorPresence = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const presenceData = await doctorService.getDoctorPresence(doctorId);

    return res.status(200).json({
      success: true,
      data: presenceData,
    });
  } catch (error) {
    console.error('Error fetching presence for doctor:', error);
    return res.status(404).json({
      success: false,
      message: error.message || 'Failed to retrieve presence details.',
    });
  }
};

/**
 * PUT /api/presence/status
 * Update authenticated doctor's presence status
 */
const updateDoctorPresence = async (req, res) => {
  try {
    // 1. Resolve doctor ID from authenticated user
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can update presence status.',
      });
    }

    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Presence status is required.',
      });
    }

    const result = await doctorService.updateDoctorPresence(doctor.id, status, notes);

    return res.status(200).json({
      success: true,
      message: `Doctor presence updated to ${status}.`,
      data: result,
    });
  } catch (error) {
    console.error('Error updating doctor presence:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update doctor presence.',
    });
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorSchedule,
  updateDoctorSchedule,
  getAllPresences,
  getDoctorPresence,
  updateDoctorPresence,
};

