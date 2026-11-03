const checkInService = require('../services/checkInService');
const { sendAppointmentReminderEmail } = require('../services/emailService');
const prisma = require('../config/db');

/**
 * Controller for QR Check-in & Live Patient Queue Management (Phase 11)
 */

// GET /api/check-in/appointment/:id/qr
const getAppointmentQR = async (req, res) => {
  try {
    const { id } = req.params;
    const qrData = await checkInService.generateAppointmentQR(id, req.user);
    return res.status(200).json({
      success: true,
      ...qrData,
    });
  } catch (err) {
    const statusCode = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/check-in/scan
const processCheckIn = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'QR code token or appointment number is required for check-in.',
      });
    }

    const result = await checkInService.processCheckIn(token, req.user);
    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.message.includes('already checked in')
      ? 409
      : err.message.includes('Invalid')
      ? 400
      : 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/queue/doctor/:doctorId
// Public query param ?public=true masks patient names for waiting-room TV display
const getLiveQueue = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const isPublic = req.query.public === 'true' || !req.user;
    const queueData = await checkInService.getLiveQueue(doctorId, isPublic);
    return res.status(200).json(queueData);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// PUT /api/queue/consultation/:id
const updateConsultationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'START' | 'COMPLETE' | 'NO_SHOW'

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action ('START', 'COMPLETE', 'NO_SHOW') is required.",
      });
    }

    const result = await checkInService.updateConsultationState(id, req.user, action);
    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/check-in/reminders/send (Admin or automated cron)
const triggerUpcomingReminders = async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startOfTomorrow = new Date(`${tomorrowStr}T00:00:00.000Z`);
    const endOfTomorrow = new Date(`${tomorrowStr}T23:59:59.999Z`);

    const upcoming = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfTomorrow,
          lte: endOfTomorrow,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminderSentAt: null,
      },
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true } } } },
        slot: true,
      },
    });

    let dispatchedCount = 0;
    for (const appt of upcoming) {
      if (appt.patient?.user?.email) {
        await sendAppointmentReminderEmail({
          to: appt.patient.user.email,
          patientName: appt.patient.user.name,
          appointmentNumber: appt.appointmentNumber,
          doctorName: appt.doctor.user.name,
          date: tomorrowStr,
          time: `${appt.slot?.startTime} - ${appt.slot?.endTime}`,
          cabin: appt.doctor.roomNumber,
        });

        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSentAt: new Date() },
        });

        dispatchedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Dispatched reminders for ${dispatchedCount} upcoming appointment(s).`,
      count: dispatchedCount,
      targetDate: tomorrowStr,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getAppointmentQR,
  processCheckIn,
  getLiveQueue,
  updateConsultationStatus,
  triggerUpcomingReminders,
};

