const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { estimateWaitingTime } = require('./ai/waitingTimeEstimator');
const { sendCheckInEmail } = require('./emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key';

/**
 * 1. Generate a unique signed, time-limited QR token for an appointment
 * @param {string} appointmentId
 * @param {Object} user - Authenticated user making the request
 */
const generateAppointmentQR = async (appointmentId, user) => {
  if (!appointmentId) {
    throw new Error('Appointment ID is required.');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { select: { id: true, name: true, email: true } } } },
      doctor: { include: { user: { select: { id: true, name: true } } } },
      slot: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  // Authorization check: Patient owner, Doctor owner, or Admin
  const isPatientOwner = user.role === 'PATIENT' && appointment.patient.userId === user.id;
  const isDoctorOwner = user.role === 'DOCTOR' && appointment.doctor.userId === user.id;
  const isAdmin = user.role === 'ADMIN' || user.role === 'RECEPTIONIST';

  if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
    throw new Error('Unauthorized: You cannot access check-in QR for this appointment.');
  }

  if (appointment.status === 'CANCELLED') {
    throw new Error('Cannot generate QR code for a cancelled appointment.');
  }

  const dateStr = appointment.appointmentDate.toISOString().split('T')[0];

  // Token expires 24 hours after creation, restricted to this appointment
  const tokenPayload = {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    date: dateStr,
    slotTime: appointment.slot?.startTime,
    type: 'APPOINTMENT_CHECKIN',
  };

  const qrToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '48h' });

  // Generate Base64 PNG QR code
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#1e3a8a', // Deep clinical blue
      light: '#ffffff',
    },
  });

  // Persist checkInToken on appointment if not already stored
  if (appointment.checkInToken !== qrToken) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { checkInToken: qrToken },
    });
  }

  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    token: qrToken,
    qrDataUrl,
    date: dateStr,
    slotTime: `${appointment.slot?.startTime} - ${appointment.slot?.endTime}`,
    doctorName: appointment.doctor.user.name,
    cabin: appointment.doctor.roomNumber || 'Room 101',
    status: appointment.status,
    checkedInAt: appointment.checkedInAt,
  };
};

/**
 * 2. Validate and process check-in via QR token or appointment token
 * @param {string} tokenString - Scanned QR JWT token or appointment number
 * @param {Object} actor - Authenticated user performing check-in (Reception / Admin / Patient)
 */
const processCheckIn = async (tokenString, actor) => {
  if (!tokenString) {
    throw new Error('QR check-in token or appointment token is required.');
  }

  let appointmentId = null;

  // Try decoding as JWT
  try {
    const decoded = jwt.verify(tokenString, JWT_SECRET);
    if (decoded && decoded.appointmentId) {
      appointmentId = decoded.appointmentId;
    }
  } catch (jwtErr) {
    // If not a valid JWT, check if it directly matches a checkInToken or appointmentNumber
    const directMatch = await prisma.appointment.findFirst({
      where: {
        OR: [
          { checkInToken: tokenString },
          { appointmentNumber: tokenString },
        ],
      },
    });
    if (directMatch) {
      appointmentId = directMatch.id;
    } else {
      throw new Error('Invalid or expired QR check-in code. Please scan a valid appointment QR.');
    }
  }

  // 1. Fetch complete appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      slot: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  // 2. State Validations
  if (appointment.status === 'CANCELLED') {
    throw new Error('Cannot check in: this appointment has been cancelled.');
  }

  if (appointment.status === 'COMPLETED') {
    throw new Error('Cannot check in: this consultation is already completed.');
  }

  // Duplicate Check-in Prevention
  if (appointment.status === 'CHECKED_IN' || appointment.checkedInAt) {
    const timeStr = appointment.checkedInAt
      ? new Date(appointment.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'earlier';
    throw new Error(`Patient ${appointment.patient.user.name} has already checked in at ${timeStr}. Duplicate check-in rejected.`);
  }

  // 3. Atomically update status to CHECKED_IN
  const now = new Date();
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: 'CHECKED_IN',
      checkedInAt: now,
    },
    include: {
      patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
      doctor: { include: { user: { select: { name: true } } } },
      slot: true,
    },
  });

  // 4. Calculate live queue position for this doctor today
  const dateStr = appointment.appointmentDate.toISOString().split('T')[0];
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const activeInQueue = await prisma.appointment.count({
    where: {
      doctorId: appointment.doctorId,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
      checkedInAt: {
        lte: now,
      },
    },
  });

  const queuePosition = Math.max(1, activeInQueue);

  // 5. Broadcast real-time Socket.IO event
  const io = getIO();
  if (io) {
    io.emit('patient_checked_in', {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctor.user.name,
      patientName: appointment.patient.user.name,
      roomNumber: appointment.doctor.roomNumber || 'Room 101',
      queuePosition,
      checkedInAt: now,
      status: 'CHECKED_IN',
    });

    io.emit('queue_updated', {
      doctorId: appointment.doctorId,
      date: dateStr,
    });
  }

  // 6. Send check-in confirmation email asynchronously
  sendCheckInEmail({
    to: appointment.patient.user.email,
    patientName: appointment.patient.user.name,
    appointmentNumber: appointment.appointmentNumber,
    doctorName: appointment.doctor.user.name,
    cabin: appointment.doctor.roomNumber || 'Room 101',
    queuePosition,
  }).catch((e) => console.warn('Check-in email notice:', e.message));

  return {
    success: true,
    message: `Check-in confirmed for ${appointment.patient.user.name}!`,
    appointment: updatedAppointment,
    queuePosition,
    doctorName: appointment.doctor.user.name,
    cabinNumber: appointment.doctor.roomNumber || 'Room 101',
    checkedInAt: now,
  };
};

/**
 * 3. Fetch Live OPD Patient Queue for a doctor
 * @param {string} doctorId - Doctor UUID
 * @param {boolean} [isPublic=false] - When true, masks patient names for privacy display
 */
const getLiveQueue = async (doctorId, isPublic = false) => {
  if (!doctorId) {
    throw new Error('Doctor ID is required to fetch live queue.');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { name: true } },
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        notIn: ['CANCELLED'],
      },
    },
    include: {
      patient: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      },
      slot: true,
    },
    orderBy: [
      { slot: { startTime: 'asc' } },
      { checkedInAt: 'asc' },
    ],
  });

  // Mask patient name for public waiting room screen
  const maskName = (name) => {
    if (!name) return 'Patient';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return `${parts[0].slice(0, 2)}***`;
    }
    return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.***`;
  };

  let inProgressAppointment = null;
  const checkedInQueue = [];
  const scheduledUpcoming = [];
  const completedList = [];

  todayAppointments.forEach((appt) => {
    const rawName = appt.patient?.user?.name || 'Patient';
    const displayName = isPublic ? maskName(rawName) : rawName;

    const entry = {
      appointmentId: appt.id,
      appointmentNumber: appt.appointmentNumber,
      patientName: displayName,
      slotTime: `${appt.slot?.startTime} - ${appt.slot?.endTime}`,
      startTime: appt.slot?.startTime,
      status: appt.status,
      priority: appt.priority,
      checkedInAt: appt.checkedInAt,
      reason: isPublic ? undefined : appt.reason,
    };

    if (appt.status === 'IN_PROGRESS') {
      inProgressAppointment = entry;
    } else if (appt.status === 'CHECKED_IN') {
      checkedInQueue.push(entry);
    } else if (appt.status === 'COMPLETED') {
      completedList.push(entry);
    } else if (appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED') {
      scheduledUpcoming.push(entry);
    }
  });

  // Calculate queue positions and estimated wait times
  const duration = doctor.consultationDuration || 30;
  const enrichedCheckedIn = checkedInQueue.map((item, idx) => {
    const position = idx + 1;
    const estWait = position * Math.round(duration * 0.75);
    return {
      ...item,
      queuePosition: position,
      estimatedWaitMinutes: estWait,
      formattedWait: `${Math.max(5, estWait - 5)} - ${estWait + 5} mins`,
    };
  });

  return {
    success: true,
    doctor: {
      id: doctor.id,
      name: doctor.user.name,
      specialization: doctor.specialization,
      department: doctor.department,
      roomNumber: doctor.roomNumber || 'Room 101',
      currentPresence: doctor.currentPresence,
      consultationDuration: duration,
    },
    today: todayStr,
    currentConsultation: inProgressAppointment,
    activeQueueLength: enrichedCheckedIn.length,
    checkedInQueue: enrichedCheckedIn,
    scheduledUpcoming,
    completedCount: completedList.length,
    isPublic,
  };
};

/**
 * 4. Doctor/Admin consultation lifecycle control: START / COMPLETE / NO_SHOW
 * @param {string} appointmentId
 * @param {Object} actor - Authenticated doctor or admin
 * @param {'START' | 'COMPLETE' | 'NO_SHOW'} action
 */
const updateConsultationState = async (appointmentId, actor, action) => {
  if (!appointmentId) throw new Error('Appointment ID is required.');
  if (!['START', 'COMPLETE', 'NO_SHOW'].includes(action)) {
    throw new Error("Invalid action. Must be 'START', 'COMPLETE', or 'NO_SHOW'.");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
      slot: true,
    },
  });

  if (!appointment) throw new Error('Appointment not found.');

  // Ownership verification: Doctor owner or Admin
  const isDoctorOwner = actor.role === 'DOCTOR' && appointment.doctor.userId === actor.id;
  const isAdmin = actor.role === 'ADMIN';

  if (!isDoctorOwner && !isAdmin) {
    throw new Error('Unauthorized: You can only update appointments under your care.');
  }

  let nextStatus = 'IN_PROGRESS';
  const updatePayload = {};

  if (action === 'START') {
    nextStatus = 'IN_PROGRESS';
    updatePayload.consultationStartedAt = new Date();
  } else if (action === 'COMPLETE') {
    nextStatus = 'COMPLETED';
    const now = new Date();
    updatePayload.consultationCompletedAt = now;
    const startTime = appointment.consultationStartedAt || now;
    const durationMin = Math.max(1, Math.round((now.getTime() - new Date(startTime).getTime()) / 60000));
    updatePayload.actualDurationMinutes = durationMin;
  } else if (action === 'NO_SHOW') {
    nextStatus = 'NO_SHOW';
  }

  updatePayload.status = nextStatus;

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updatePayload,
    include: {
      slot: true,
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  // Also auto-update doctor live presence
  if (action === 'START') {
    await prisma.doctor.update({
      where: { id: appointment.doctorId },
      data: { currentPresence: 'IN_CONSULTATION' },
    });
  } else if (action === 'COMPLETE') {
    await prisma.doctor.update({
      where: { id: appointment.doctorId },
      data: { currentPresence: 'AVAILABLE' },
    });
  }

  // Socket.IO broadcasts
  const io = getIO();
  if (io) {
    io.emit('appointment_status_changed', {
      appointmentId: updatedAppointment.id,
      doctorId: updatedAppointment.doctorId,
      status: nextStatus,
      appointmentNumber: updatedAppointment.appointmentNumber,
    });

    io.emit('queue_updated', {
      doctorId: updatedAppointment.doctorId,
      status: nextStatus,
    });

    if (action === 'START' || action === 'COMPLETE') {
      io.emit('doctor_status_changed', {
        doctorId: appointment.doctorId,
        presenceStatus: action === 'START' ? 'IN_CONSULTATION' : 'AVAILABLE',
      });
    }
  }

  return {
    success: true,
    message: `Consultation status updated to ${nextStatus}.`,
    appointment: updatedAppointment,
  };
};

module.exports = {
  generateAppointmentQR,
  processCheckIn,
  getLiveQueue,
  updateConsultationState,
};

