const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { calculatePriorityScore, explainScore } = require('./priorityService');

// Valid priority levels
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'];

/**
 * 1. Join the smart waitlist (Authenticated Patient)
 */
const joinWaitlist = async ({
  userId,
  doctorId,
  medicalPriority = 'MEDIUM',
  urgency = 'MEDIUM',
  preferredDate,
  notes = '',
}) => {
  // 1. Resolve Patient
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!patient) {
    throw new Error('Only registered patients can join the waitlist.');
  }

  // 2. Resolve Doctor
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!doctor) {
    throw new Error('Selected doctor does not exist.');
  }

  // 3. Normalize priority inputs
  let normalizedPriority = String(medicalPriority || 'MEDIUM').toUpperCase();
  if (normalizedPriority === 'CRITICAL') normalizedPriority = 'EMERGENCY';

  const normalizedUrgency = String(urgency || 'MEDIUM').toUpperCase();

  if (!VALID_PRIORITIES.includes(normalizedPriority)) {
    throw new Error(`Invalid medical priority '${medicalPriority}'. Must be LOW, MEDIUM, HIGH, or CRITICAL/EMERGENCY.`);
  }

  if (!VALID_PRIORITIES.includes(normalizedUrgency)) {
    throw new Error(`Invalid urgency '${urgency}'. Must be LOW, MEDIUM, HIGH, or EMERGENCY.`);
  }

  // 4. Preferred Date parsing
  const dateStr = preferredDate || new Date().toISOString().split('T')[0];
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  // 5. Prevent conflict: Patient already has an active appointment with this doctor on this date
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      doctorId,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        notIn: ['CANCELLED'],
      },
    },
  });

  if (existingAppointment) {
    throw new Error('You already have an active appointment scheduled with this doctor on this date.');
  }

  // 6. Prevent duplicate waitlist entry: Patient is already active on this doctor's waitlist
  const existingWaitlist = await prisma.waitlist.findFirst({
    where: {
      patientId: patient.id,
      doctorId,
      status: 'PENDING',
    },
  });

  if (existingWaitlist) {
    throw new Error('You are already actively waitlisted for this doctor.');
  }

  // 7. Calculate initial rule-based priority score
  const now = new Date();
  const initialScore = calculatePriorityScore({
    priority: normalizedPriority,
    urgency: normalizedUrgency,
    createdAt: now,
    now,
  });

  const explanation = explainScore({
    priority: normalizedPriority,
    urgency: normalizedUrgency,
    createdAt: now,
    now,
  });

  // 8. Create Waitlist record in PostgreSQL
  const waitlistEntry = await prisma.waitlist.create({
    data: {
      patientId: patient.id,
      doctorId,
      preferredDate: startOfDay,
      priority: normalizedPriority,
      urgency: normalizedUrgency,
      priorityScore: initialScore,
      status: 'PENDING',
      notes: notes || null,
    },
    include: {
      doctor: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      patient: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('waitlist_updated', {
      waitlistId: waitlistEntry.id,
      doctorId: waitlistEntry.doctorId,
      patientId: waitlistEntry.patientId,
      status: 'PENDING',
      action: 'JOINED',
    });
  }

  return {
    ...waitlistEntry,
    explanation,
  };
};

/**
 * 2. Get logged-in patient's waitlist entries with dynamic updated scores
 */
const getPatientWaitlistEntries = async (userId) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    throw new Error('Patient profile not found.');
  }

  const entries = await prisma.waitlist.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  return entries.map((entry) => {
    const currentScore = calculatePriorityScore({
      priority: entry.priority,
      urgency: entry.urgency,
      createdAt: entry.createdAt,
      now,
    });
    const explanation = explainScore({
      priority: entry.priority,
      urgency: entry.urgency,
      createdAt: entry.createdAt,
      now,
    });

    return {
      ...entry,
      currentScore,
      explanation,
    };
  });
};

/**
 * 3. Get doctor's waitlist entries ranked by priority score
 */
const getDoctorWaitlistEntries = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found.');
  }

  const entries = await prisma.waitlist.findMany({
    where: { doctorId: doctor.id },
    include: {
      patient: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const scored = entries.map((entry) => {
    const currentScore = calculatePriorityScore({
      priority: entry.priority,
      urgency: entry.urgency,
      createdAt: entry.createdAt,
      now,
    });
    const explanation = explainScore({
      priority: entry.priority,
      urgency: entry.urgency,
      createdAt: entry.createdAt,
      now,
    });

    return {
      ...entry,
      currentScore,
      explanation,
    };
  });

  // Sort: PENDING entries first (by score DESC, then joined time ASC), then others
  scored.sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    if (b.currentScore !== a.currentScore) {
      return b.currentScore - a.currentScore;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return scored;
};

/**
 * 4. Leave waitlist (Patient owner only)
 */
const leaveWaitlist = async (waitlistId, user) => {
  const entry = await prisma.waitlist.findUnique({
    where: { id: waitlistId },
    include: {
      patient: true,
    },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found.');
  }

  if (entry.patient.userId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Unauthorized: You do not own this waitlist entry.');
  }

  if (entry.status !== 'PENDING') {
    throw new Error(`Cannot leave waitlist: entry status is already ${entry.status}.`);
  }

  const updated = await prisma.waitlist.update({
    where: { id: waitlistId },
    data: { status: 'CANCELLED' },
    include: {
      doctor: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('waitlist_updated', {
      waitlistId: updated.id,
      doctorId: updated.doctorId,
      patientId: updated.patientId,
      status: 'CANCELLED',
      action: 'LEFT',
    });
  }

  return updated;
};

module.exports = {
  joinWaitlist,
  getPatientWaitlistEntries,
  getDoctorWaitlistEntries,
  leaveWaitlist,
};

