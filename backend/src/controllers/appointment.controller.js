const appointmentService = require('../services/appointment.service');

/**
 * GET /api/appointments/slots/:doctorId?date=YYYY-MM-DD
 * Get open appointment slots for a selected doctor and date
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter date (YYYY-MM-DD) is required.',
      });
    }

    const result = await appointmentService.getAvailableSlots(doctorId, date);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAvailableSlots:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve available slots.',
    });
  }
};

/**
 * POST /api/appointments
 * Book a new appointment (PATIENT only)
 */
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, priority, reason } = req.body;

    if (!doctorId || !date || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, date, and startTime are required to book an appointment.',
      });
    }

    const appointment = await appointmentService.bookAppointment({
      userId: req.user.id,
      doctorId,
      date,
      startTime,
      endTime,
      priority,
      reason,
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment,
    });
  } catch (error) {
    console.error('Error in bookAppointment:', error.message);
    const isConflict =
      error.message.includes('already booked') ||
      error.message.includes('already have an appointment');
    const isForbidden = error.message.includes('Only registered patients');
    const isNotFound = error.message.includes('not exist');

    const statusCode = isConflict ? 409 : isForbidden ? 403 : isNotFound ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to book appointment.',
    });
  }
};

/**
 * GET /api/appointments/my
 * View appointments for authenticated patient
 */
const getPatientAppointments = async (req, res) => {
  try {
    const appointments = await appointmentService.getPatientAppointments(req.user.id);
    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Error in getPatientAppointments:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve your appointments.',
    });
  }
};

/**
 * GET /api/appointments/doctor/my
 * View all appointments for authenticated doctor
 */
const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await appointmentService.getDoctorAppointments(req.user.id);
    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Error in getDoctorAppointments:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve doctor appointments.',
    });
  }
};

/**
 * GET /api/appointments/doctor/today
 * View today's appointments for authenticated doctor
 */
const getTodayDoctorAppointments = async (req, res) => {
  try {
    const appointments = await appointmentService.getTodayDoctorAppointments(req.user.id);
    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Error in getTodayDoctorAppointments:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve today's appointments.",
    });
  }
};

/**
 * PUT /api/appointments/:id/cancel
 * Cancel an appointment (Patient owner or Doctor owner)
 */
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const cancelled = await appointmentService.cancelAppointment(id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment: cancelled,
    });
  } catch (error) {
    console.error('Error in cancelAppointment:', error.message);
    const isUnauthorized = error.message.includes('Unauthorized');
    const isNotFound = error.message.includes('not found');
    const statusCode = isUnauthorized ? 403 : isNotFound ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to cancel appointment.',
    });
  }
};

/**
 * PUT /api/appointments/:id/status
 * Update appointment status (Doctor owner only)
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'New status is required.',
      });
    }

    const updated = await appointmentService.updateAppointmentStatus(
      id,
      req.user.id,
      status
    );

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment: updated,
    });
  } catch (error) {
    console.error('Error in updateAppointmentStatus:', error.message);
    const isUnauthorized = error.message.includes('Unauthorized');
    const isNotFound = error.message.includes('not found');
    const statusCode = isUnauthorized ? 403 : isNotFound ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update appointment status.',
    });
  }
};

module.exports = {
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getTodayDoctorAppointments,
  cancelAppointment,
  updateAppointmentStatus,
};

