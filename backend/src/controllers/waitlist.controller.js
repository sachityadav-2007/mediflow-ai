const waitlistService = require('../services/waitlist.service');
const { smartAllocateSlot, getAllocationRecommendations } = require('../services/allocationService');

/**
 * POST /api/waitlist
 * Join doctor's waitlist (PATIENT only)
 */
const joinWaitlist = async (req, res) => {
  try {
    const { doctorId, medicalPriority, urgency, preferredDate, notes } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'doctorId is required to join the waitlist.',
      });
    }

    const result = await waitlistService.joinWaitlist({
      userId: req.user.id,
      doctorId,
      medicalPriority,
      urgency,
      preferredDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist with smart priority scoring.',
      waitlist: result,
    });
  } catch (error) {
    console.error('Error in joinWaitlist:', error.message);
    const isConflict =
      error.message.includes('already actively waitlisted') ||
      error.message.includes('already have an active appointment');
    const isForbidden = error.message.includes('Only registered patients');
    const isNotFound = error.message.includes('does not exist');

    const statusCode = isConflict ? 409 : isForbidden ? 403 : isNotFound ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to join waitlist.',
    });
  }
};

/**
 * GET /api/waitlist/my
 * View logged-in patient's waitlist entries
 */
const getPatientWaitlist = async (req, res) => {
  try {
    const entries = await waitlistService.getPatientWaitlistEntries(req.user.id);
    return res.status(200).json({
      success: true,
      count: entries.length,
      waitlist: entries,
    });
  } catch (error) {
    console.error('Error in getPatientWaitlist:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve your waitlist entries.',
    });
  }
};

/**
 * GET /api/waitlist/doctor/my
 * View doctor's waitlist entries ranked by priority score
 */
const getDoctorWaitlist = async (req, res) => {
  try {
    const entries = await waitlistService.getDoctorWaitlistEntries(req.user.id);
    return res.status(200).json({
      success: true,
      count: entries.length,
      waitlist: entries,
    });
  } catch (error) {
    console.error('Error in getDoctorWaitlist:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve doctor waitlist.',
    });
  }
};

/**
 * PUT /api/waitlist/:id/leave
 * Patient leaves the waitlist
 */
const leaveWaitlist = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await waitlistService.leaveWaitlist(id, req.user);

    return res.status(200).json({
      success: true,
      message: 'You have left the waitlist.',
      waitlist: result,
    });
  } catch (error) {
    console.error('Error in leaveWaitlist:', error.message);
    const isUnauthorized = error.message.includes('Unauthorized');
    const isNotFound = error.message.includes('not found');
    const statusCode = isUnauthorized ? 403 : isNotFound ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to leave waitlist.',
    });
  }
};

/**
 * GET /api/waitlist/recommendations
 * Discover smart allocation recommendations for open slots (ADMIN / DOCTOR)
 */
const getRecommendations = async (req, res) => {
  try {
    const { doctorId, appointmentDate } = req.query;
    const recommendations = await getAllocationRecommendations({
      doctorId,
      appointmentDate,
    });
    return res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error in getRecommendations:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve allocation recommendations.',
    });
  }
};

/**
 * POST /api/waitlist/allocate
 * Trigger smart allocation of an open slot (ADMIN / Authorized system workflow)
 */
const allocateSlot = async (req, res) => {
  try {
    const { doctorId, appointmentDate, startTime, endTime, waitlistId } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'doctorId is required for slot allocation.',
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = appointmentDate || todayStr;
    const targetStart = startTime || '10:00';
    const targetEnd = endTime || '10:30';

    const result = await smartAllocateSlot({
      doctorId,
      appointmentDate: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      waitlistId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in allocateSlot:', error.message);
    const isConflict = error.message.includes('already booked');
    const isNotFound = error.message.includes('not found');
    const statusCode = isConflict ? 409 : isNotFound ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to perform smart slot allocation.',
    });
  }
};

module.exports = {
  joinWaitlist,
  getPatientWaitlist,
  getDoctorWaitlist,
  leaveWaitlist,
  allocateSlot,
  getRecommendations,
};

