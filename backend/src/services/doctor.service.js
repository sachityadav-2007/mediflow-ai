const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { clearCache } = require('./ai/aiService');
const { checkAndNotifyWaitlistOpportunity } = require('./allocationService');

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

// Valid presence statuses from Prisma schema
const VALID_PRESENCE_STATUSES = [
  'PRESENT',
  'AWAY',
  'BUSY',
  'OFFLINE',
  'AVAILABLE',
  'IN_CONSULTATION',
  'ON_BREAK',
  'ON_LEAVE',
];

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
      attendances: {
        where: { status: 'CHECKED_IN' },
        orderBy: { checkInTime: 'desc' },
        take: 1,
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

  if (!doctor) return null;

  // Authoritative presence synchronization:
  // If doctor has no active checked-in attendance session, clinical presence cannot be PRESENT/AVAILABLE
  if (doctor.attendances.length === 0 && (doctor.currentPresence === 'PRESENT' || doctor.currentPresence === 'AVAILABLE')) {
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'OFFLINE' },
    });
    doctor.currentPresence = 'OFFLINE';
  }

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
    // A. Synchronize DoctorAttendance session:
    // If doctor is checking out to OFFLINE, close any active CHECKED_IN session
    if (status === 'OFFLINE') {
      const activeSession = await tx.doctorAttendance.findFirst({
        where: { doctorId, status: 'CHECKED_IN' },
        orderBy: { checkInTime: 'desc' },
      });
      if (activeSession) {
        const now = new Date();
        const durationMs = Math.max(0, now.getTime() - new Date(activeSession.checkInTime).getTime());
        const durationMinutes = Math.max(0, Math.round(durationMs / 60000));
        await tx.doctorAttendance.update({
          where: { id: activeSession.id },
          data: {
            checkOutTime: now,
            durationMinutes,
            status: 'CHECKED_OUT',
            checkOutMethod: 'MANUAL',
            notes: notes ? `${activeSession.notes || ''} | Dashboard Offline: ${notes}` : activeSession.notes,
          },
        });
      }
    } else {
      // If setting to active clinical presence (PRESENT, AVAILABLE, BUSY, IN_CONSULTATION, ON_BREAK),
      // ensure an active attendance session exists so attendance and presence never contradict
      const activeSession = await tx.doctorAttendance.findFirst({
        where: { doctorId, status: 'CHECKED_IN' },
        orderBy: { checkInTime: 'desc' },
      });
      if (!activeSession) {
        const docRecord = await tx.doctor.findUnique({ where: { id: doctorId } });
        await tx.doctorAttendance.create({
          data: {
            doctorId,
            location: docRecord?.roomNumber ? `Doctor Clinic - ${docRecord.roomNumber}` : 'MediFlow Central OPD Suite',
            status: 'CHECKED_IN',
            checkInMethod: 'MANUAL',
            notes: notes || 'Manual clinical presence activation from Doctor Portal',
          },
        });
      }
    }

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
        detectionMethod: 'MANUAL',
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
    // Standard Phase 7 event
    io.emit('doctor_status_changed', {
      doctorId: result.doctorId,
      presenceStatus: result.currentPresence,
      updatedAt: result.log.timestamp,
    });
    // Attendance monitor event
    io.emit('doctor_attendance_updated', {
      doctorId: result.doctorId,
      doctorName: result.doctorName,
      action: result.currentPresence === 'OFFLINE' ? 'CHECK_OUT' : 'CHECK_IN',
      presenceStatus: result.currentPresence,
      timestamp: result.log.timestamp,
    });
    // Backward-compatible alias
    io.emit('doctor_presence_changed', {
      doctorId: result.doctorId,
      status: result.currentPresence,
      timestamp: result.log.timestamp,
    });
    // Invalidate AI prediction cache and notify listeners
    clearCache();
    io.emit('ai_forecast_updated', {
      type: 'DOCTOR_PRESENCE_CHANGED',
      doctorId: result.doctorId,
      status: result.currentPresence,
    });
  }

  // Check if doctor becoming available creates an allocation opportunity
  if (result.currentPresence === 'AVAILABLE' || result.currentPresence === 'PRESENT') {
    checkAndNotifyWaitlistOpportunity(result.doctorId).catch((err) =>
      console.warn('[DoctorService] Waitlist opportunity check notice:', err.message)
    );
  }

  return result;
};


// -----------------------------------------------------------------------------
// Date-specific availability slots
// These records extend the recurring weekly schedule without replacing it.
// -----------------------------------------------------------------------------
const isValidCalendarDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const availabilityTimeToMinutes = (value) => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    throw new Error('Times must use valid HH:MM 24-hour format.');
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const getUtcDayBounds = (date) => ({
  gte: new Date(`${date}T00:00:00.000Z`),
  lt: new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000),
});

const getDoctorAvailabilityCalendar = async (doctorId, startDate, endDate) => {
  if (!isValidCalendarDate(startDate) || !isValidCalendarDate(endDate) || startDate > endDate) {
    throw new Error('A valid date range is required (YYYY-MM-DD).');
  }
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return prisma.appointmentSlot.findMany({
    where: { doctorId, slotDate: { gte: start, lt: end } },
    include: { appointment: { select: { id: true, status: true } } },
    orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
  });
};

const createDoctorAvailabilitySlot = async (doctorId, { date, startTime, endTime }) => {
  if (!isValidCalendarDate(date)) throw new Error('A valid date is required (YYYY-MM-DD).');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.HOSPITAL_TIMEZONE || 'Asia/Kolkata' }).format(new Date());
  if (date < today) throw new Error('Availability cannot be added for a past date.');
  const startMinutes = availabilityTimeToMinutes(startTime);
  const endMinutes = availabilityTimeToMinutes(endTime);
  if (startMinutes >= endMinutes) throw new Error('End time must be later than start time.');

  const slotDate = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][slotDate.getUTCDay()];
  const [doctor, existingSlots] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true, consultationDuration: true, availabilities: true } }),
    prisma.appointmentSlot.findMany({ where: { doctorId, slotDate: getUtcDayBounds(date) }, select: { id: true, startTime: true, endTime: true, status: true } }),
  ]);
  if (!doctor) throw new Error('Doctor not found.');

  const duration = doctor.consultationDuration || 30;
  if (endMinutes - startMinutes !== duration) {
    throw new Error(`Availability slots must be exactly ${duration} minutes long.`);
  }

  const recurring = doctor.availabilities.find((item) => item.dayOfWeek === dayOfWeek && item.isAvailable);
  if (recurring) {
    const recurringStart = availabilityTimeToMinutes(recurring.startTime);
    const recurringEnd = availabilityTimeToMinutes(recurring.endTime);
    if (startMinutes < recurringEnd && endMinutes > recurringStart) {
      throw new Error('This time overlaps the recurring weekly schedule. Use the weekly schedule editor for regular hours.');
    }
  }

  const overlaps = existingSlots.some((slot) => {
    const otherStart = availabilityTimeToMinutes(slot.startTime);
    const otherEnd = availabilityTimeToMinutes(slot.endTime);
    return startMinutes < otherEnd && endMinutes > otherStart;
  });
  if (overlaps) throw new Error('This time overlaps an existing availability slot.');

  return prisma.appointmentSlot.create({
    data: { doctorId, slotDate, startTime, endTime, status: 'AVAILABLE' },
  });
};

const updateDoctorAvailabilitySlot = async (doctorId, slotId, updates) => {
  const existing = await prisma.appointmentSlot.findFirst({
    where: { id: slotId, doctorId },
    include: { appointment: { select: { id: true, status: true } } },
  });
  if (!existing) throw new Error('Availability slot not found.');
  if (existing.status === 'BOOKED' || existing.appointment) {
    throw new Error('Slots linked to an appointment cannot be modified.');
  }

  const data = {};
  if (updates.status !== undefined) {
    if (!['AVAILABLE', 'BLOCKED'].includes(updates.status)) {
      throw new Error('Slot status must be AVAILABLE or BLOCKED.');
    }
    data.status = updates.status;
  }
  if (updates.date !== undefined || updates.startTime !== undefined || updates.endTime !== undefined) {
    const date = updates.date || existing.slotDate.toISOString().slice(0, 10);
    const startTime = updates.startTime || existing.startTime;
    const endTime = updates.endTime || existing.endTime;
    if (!isValidCalendarDate(date)) throw new Error('A valid date is required (YYYY-MM-DD).');
    const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: process.env.HOSPITAL_TIMEZONE || 'Asia/Kolkata',
}).format(new Date());

if (date < today) {
  throw new Error('Availability cannot be moved to a past date.');
}
    const startMinutes = availabilityTimeToMinutes(startTime);
    const endMinutes = availabilityTimeToMinutes(endTime);
    if (startMinutes >= endMinutes) throw new Error('End time must be later than start time.');
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { consultationDuration: true, availabilities: true } });
    if (!doctor || endMinutes - startMinutes !== (doctor.consultationDuration || 30)) {
      throw new Error(`Availability slots must be exactly ${doctor?.consultationDuration || 30} minutes long.`);
    }
    const dateDay = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][dateDay];
    const recurring = doctor.availabilities.find((item) => item.dayOfWeek === dayName && item.isAvailable);
    if (recurring && startMinutes < availabilityTimeToMinutes(recurring.endTime) && endMinutes > availabilityTimeToMinutes(recurring.startTime)) {
      throw new Error('This time overlaps the recurring weekly schedule.');
    }
    const overlap = await prisma.appointmentSlot.findFirst({
      where: {
        doctorId,
        id: { not: slotId },
        slotDate: getUtcDayBounds(date),
        NOT: [{ startTime: { gte: endTime } }, { endTime: { lte: startTime } }],
      },
      select: { id: true },
    });
    if (overlap) throw new Error('This time overlaps another availability slot.');
    data.slotDate = new Date(`${date}T00:00:00.000Z`);
    data.startTime = startTime;
    data.endTime = endTime;
  }
  return prisma.appointmentSlot.update({ where: { id: slotId }, data });
};

const deleteDoctorAvailabilitySlot = async (doctorId, slotId) => {
  const existing = await prisma.appointmentSlot.findFirst({
    where: { id: slotId, doctorId },
    include: { appointment: { select: { id: true, status: true } } },
  });
  if (!existing) throw new Error('Availability slot not found.');
  if (existing.status === 'BOOKED' || existing.appointment) {
    throw new Error('Slots linked to an appointment cannot be deleted.');
  }
  return prisma.appointmentSlot.delete({ where: { id: slotId } });
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  getDoctorProfileByUserId,
  updateDoctorProfile,
  getDoctorSchedule,
  updateDoctorSchedule,
  getDoctorAvailabilityCalendar,
  createDoctorAvailabilitySlot,
  updateDoctorAvailabilitySlot,
  deleteDoctorAvailabilitySlot,
  getAllPresences,
  getDoctorPresence,
  updateDoctorPresence,
};

