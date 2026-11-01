const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// Valid days of week for schedule verification
const VALID_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

// Valid presence statuses
const VALID_PRESENCE_STATUSES = ['PRESENT', 'AWAY', 'BUSY', 'OFFLINE'];

/**
 * 1. Get all doctors with optional name search and specialization filter
 */
const getAllDoctors = async ({ search, specialization }) => {
  const whereClause = {};

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.OR = [
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { specialization: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (specialization && specialization.trim() && specialization !== 'ALL') {
    whereClause.specialization = {
      contains: specialization.trim(),
      mode: 'insensitive',
    };
  }

  const doctors = await prisma.doctor.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      availabilities: {
        where: { isAvailable: true },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isAvailable: true,
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  });

  return doctors;
};

/**
 * 2. Get single doctor by doctor ID
 */
const getDoctorById = async (id) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      availabilities: true,
      presenceLogs: {
        orderBy: { timestamp: 'desc' },
        take: 5,
      },
    },
  });

  return doctor;
};

/**
 * 3. Get doctor profile for an authenticated user ID
 */
const getDoctorProfileByUserId = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      availabilities: {
        orderBy: { dayOfWeek: 'asc' },
      },
      presenceLogs: {
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
      appointments: {
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
          slot: {
            select: {
              startTime: true,
              endTime: true,
              slotDate: true,
            },
          },
        },
        orderBy: { appointmentDate: 'desc' },
        take: 10,
      },
    },
  });

  return doctor;
};

/**
 * 4. Update doctor profile (by authenticated userId)
 */
const updateDoctorProfile = async (userId, updateData) => {
  const {
    name,
    phone,
    specialization,
    department,
    experience,
    qualification,
    consultationFee,
    consultationDuration,
    roomNumber,
  } = updateData;

  // Perform updates in a single transaction
  const updatedDoctor = await prisma.$transaction(async (tx) => {
    // Update user personal details
    if (name || phone !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
        },
      });
    }

    // Update doctor professional details
    return await tx.doctor.update({
      where: { userId },
      data: {
        ...(specialization && { specialization }),
        ...(department && { department }),
        ...(experience !== undefined && { experience: parseInt(experience, 10) }),
        ...(qualification && { qualification }),
        ...(consultationFee !== undefined && {
          consultationFee: parseFloat(consultationFee),
        }),
        ...(consultationDuration !== undefined && {
          consultationDuration: parseInt(consultationDuration, 10),
        }),
        ...(roomNumber !== undefined && { roomNumber }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        availabilities: true,
      },
    });
  });

  return updatedDoctor;
};

/**
 * 5. Get doctor schedule
 */
const getDoctorSchedule = async (doctorId) => {
  const schedules = await prisma.doctorAvailability.findMany({
    where: { doctorId },
    orderBy: { dayOfWeek: 'asc' },
  });

  return schedules;
};

/**
 * 6. Update doctor working schedule
 * Validates days, start times, and end times
 */
const updateDoctorSchedule = async (doctorId, schedules, consultationDuration) => {
  if (!Array.isArray(schedules)) {
    throw new Error('Schedules must be provided as an array.');
  }

  // Time format regex (HH:MM in 24-hour format)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  for (const item of schedules) {
    if (!VALID_DAYS.includes(item.dayOfWeek)) {
      throw new Error(`Invalid dayOfWeek: ${item.dayOfWeek}`);
    }

    if (!timeRegex.test(item.startTime) || !timeRegex.test(item.endTime)) {
      throw new Error('Times must be in valid HH:MM 24-hour format (e.g. 09:00).');
    }

    if (item.startTime >= item.endTime) {
      throw new Error(
        `Start time (${item.startTime}) must be strictly before end time (${item.endTime}) for ${item.dayOfWeek}.`
      );
    }
  }

  // Update in a transaction: delete old availabilities and insert new ones
  const result = await prisma.$transaction(async (tx) => {
    // Optionally update consultation duration if provided
    if (consultationDuration) {
      await tx.doctor.update({
        where: { id: doctorId },
        data: {
          consultationDuration: parseInt(consultationDuration, 10),
        },
      });
    }

    // Clear old availabilities
    await tx.doctorAvailability.deleteMany({
      where: { doctorId },
    });

    // Create new availabilities
    if (schedules.length > 0) {
      await tx.doctorAvailability.createMany({
        data: schedules.map((item) => ({
          doctorId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
          presenceStatus: 'PRESENT',
        })),
      });
    }

    return await tx.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  });

  return result;
};

/**
 * 7. Get current presence for all doctors
 */
const getAllPresences = async () => {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      specialization: true,
      department: true,
      roomNumber: true,
      currentPresence: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      presenceLogs: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      user: { name: 'asc' },
    },
  });

  return doctors.map((doc) => ({
    doctorId: doc.id,
    name: doc.user.name,
    email: doc.user.email,
    specialization: doc.specialization,
    department: doc.department,
    roomNumber: doc.roomNumber,
    currentPresence: doc.currentPresence,
    lastUpdated: doc.presenceLogs[0]?.timestamp || doc.updatedAt,
    notes: doc.presenceLogs[0]?.notes || null,
  }));
};

/**
 * 8. Get presence status and history for a specific doctor
 */
const getDoctorPresence = async (doctorId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      currentPresence: true,
      roomNumber: true,
      specialization: true,
      department: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      presenceLogs: {
        orderBy: { timestamp: 'desc' },
        take: 15,
      },
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  return {
    doctorId: doctor.id,
    name: doctor.user.name,
    specialization: doctor.specialization,
    department: doctor.department,
    roomNumber: doctor.roomNumber,
    currentPresence: doctor.currentPresence,
    history: doctor.presenceLogs,
  };
};

/**
 * 9. Update doctor presence status and record in PresenceLog
 */
const updateDoctorPresence = async (doctorId, status, notes = '') => {
  if (!VALID_PRESENCE_STATUSES.includes(status)) {
    throw new Error(
      `Invalid presence status '${status}'. Must be one of: ${VALID_PRESENCE_STATUSES.join(', ')}`
    );
  }

  // Update doctor presence and write audit log in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update doctor currentPresence
    const updatedDoctor = await tx.doctor.update({
      where: { id: doctorId },
      data: { currentPresence: status },
      include: {
        user: { select: { name: true } },
      },
    });

    // 2. Insert PresenceLog entry
    const logEntry = await tx.presenceLog.create({
      data: {
        doctorId,
        status,
        detectionMethod: 'MANUAL', // Recorded as MANUAL for now
        notes: notes || `Status updated to ${status} by doctor`,
      },
    });

    return {
      doctorId: updatedDoctor.id,
      doctorName: updatedDoctor.user.name,
      currentPresence: updatedDoctor.currentPresence,
      log: logEntry,
    };
  });

  // 3. Emit real-time notification via Socket.IO if connected
  const io = getIO();
  if (io) {
    io.emit('doctor_presence_changed', {
      doctorId: result.doctorId,
      status: result.currentPresence,
      timestamp: result.log.timestamp,
    });
  }

  return result;
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  getDoctorProfileByUserId,
  updateDoctorProfile,
  getDoctorSchedule,
  updateDoctorSchedule,
  getAllPresences,
  getDoctorPresence,
  updateDoctorPresence,
};

