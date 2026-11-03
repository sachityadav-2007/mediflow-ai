const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { smartAllocateSlot } = require('./allocationService');
const { clearCache } = require('./ai/aiService');
const {
  sendBookingConfirmationEmail,
  sendRescheduleEmail,
  sendCancellationEmail,
} = require('./emailService');
const {
  generateTimeSlots,
  getDayOfWeekFromDate,
  timeToMinutes,
  minutesToTime,
} = require('../utils/slotGenerator');

// Valid appointment statuses from Prisma enum
const VALID_APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

/**
 * 1. Get available appointment slots for a specific doctor and date
 */
const getAvailableSlots = async (doctorId, dateStr) => {
  if (!doctorId) {
    throw new Error('Doctor ID is required.');
  }

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Valid appointment date (YYYY-MM-DD) is required.');
  }

  // Find doctor and their recurring weekly schedules
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      availabilities: true,
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  // Check if doctor is OFFLINE
  if (doctor.currentPresence === 'OFFLINE') {
    return {
      success: true,
      available: false,
      reason: 'OFFLINE',
      message: 'Doctor is currently OFFLINE and not accepting appointments.',
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      currentPresence: doctor.currentPresence,
      date: dateStr,
      slots: [],
    };
  }

  // Determine the day of week (e.g. MONDAY)
  const dayOfWeek = getDayOfWeekFromDate(dateStr);

  // Find active schedule for this day
  const scheduleForDay = doctor.availabilities.find(
    (item) => item.dayOfWeek === dayOfWeek && item.isAvailable === true
  );

  if (!scheduleForDay) {
    return {
      success: true,
      available: false,
      reason: 'NO_SCHEDULE',
      message: `Doctor has no working schedule on ${dayOfWeek}.`,
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      currentPresence: doctor.currentPresence,
      date: dateStr,
      dayOfWeek,
      slots: [],
    };
  }

  // Generate all possible discrete time slots for this shift
  const duration = doctor.consultationDuration || 30;
  const allGeneratedSlots = generateTimeSlots(
    scheduleForDay.startTime,
    scheduleForDay.endTime,
    duration
  );

  // Define date bounds for querying booked slots
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  // Query existing booked slots from DB
  const bookedSlots = await prisma.appointmentSlot.findMany({
    where: {
      doctorId: doctor.id,
      slotDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'BOOKED',
    },
    select: {
      startTime: true,
    },
  });

  // Query active (non-cancelled) appointments for this doctor on this day
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        notIn: ['CANCELLED'],
      },
    },
    include: {
      slot: {
        select: {
          startTime: true,
        },
      },
    },
  });

  // Build a Set of already-booked start times
  const bookedTimesSet = new Set();
  bookedSlots.forEach((s) => bookedTimesSet.add(s.startTime));
  activeAppointments.forEach((a) => {
    if (a.slot?.startTime) {
      bookedTimesSet.add(a.slot.startTime);
    }
  });

  // Filter out booked slots to return only open slots
  const availableSlots = allGeneratedSlots.filter(
    (slot) => !bookedTimesSet.has(slot.startTime)
  );

  return {
    success: true,
    available: true,
    doctorId: doctor.id,
    doctorName: doctor.user.name,
    specialization: doctor.specialization,
    currentPresence: doctor.currentPresence,
    consultationDuration: duration,
    consultationFee: doctor.consultationFee,
    date: dateStr,
    dayOfWeek,
    totalSlots: allGeneratedSlots.length,
    availableCount: availableSlots.length,
    slots: availableSlots,
  };
};

/**
 * 2. Book an appointment for an authenticated patient
 */
const bookAppointment = async ({
  userId,
  doctorId,
  date,
  startTime,
  endTime,
  priority = 'MEDIUM',
  reason = '',
}) => {
  // 1. Verify Patient profile exists
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!patient) {
    throw new Error('Only registered patients can book appointments.');
  }

  // 2. Verify Doctor exists and is available
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: true,
      availabilities: true,
    },
  });

  if (!doctor) {
    throw new Error('Selected doctor does not exist.');
  }

  if (doctor.currentPresence === 'OFFLINE') {
    throw new Error('Doctor is currently OFFLINE and cannot accept appointments.');
  }

  // 3. Verify date format and doctor working schedule
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Valid appointment date (YYYY-MM-DD) is required.');
  }

  const dayOfWeek = getDayOfWeekFromDate(date);
  const activeSchedule = doctor.availabilities.find(
    (item) => item.dayOfWeek === dayOfWeek && item.isAvailable === true
  );

  if (!activeSchedule) {
    throw new Error(`Doctor does not have an active schedule on ${dayOfWeek}.`);
  }

  // 4. Verify slot time bounds
  if (!startTime) {
    throw new Error('Start time is required.');
  }

  const slotStartMin = timeToMinutes(startTime);
  const schedStartMin = timeToMinutes(activeSchedule.startTime);
  const schedEndMin = timeToMinutes(activeSchedule.endTime);

  if (slotStartMin < schedStartMin || slotStartMin >= schedEndMin) {
    throw new Error(
      `Selected time (${startTime}) is outside the doctor's working hours (${activeSchedule.startTime} - ${activeSchedule.endTime}).`
    );
  }

  // Calculate default endTime if not passed
  const duration = doctor.consultationDuration || 30;
  const calculatedEndTime = endTime || minutesToTime(slotStartMin + duration);

  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  // 5. Atomic Booking Transaction to prevent double booking
  const appointment = await prisma.$transaction(async (tx) => {
    // Check doctor slot conflict: is there already an active appointment?
    const conflict = await tx.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        slot: {
          startTime,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
    });

    if (conflict) {
      throw new Error('This time slot is already booked. Please choose another slot.');
    }

    // Check patient conflict: does patient already have an appointment at this time?
    const patientConflict = await tx.appointment.findFirst({
      where: {
        patientId: patient.id,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        slot: {
          startTime,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
    });

    if (patientConflict) {
      throw new Error('You already have an appointment booked at this time slot.');
    }

    // Find or create AppointmentSlot record
    let slot = await tx.appointmentSlot.findFirst({
      where: {
        doctorId,
        slotDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        startTime,
      },
    });

    if (slot) {
      if (slot.status === 'BOOKED') {
        throw new Error('This time slot is already booked. Please choose another slot.');
      }

      // Check if this slot was previously attached to an existing appointment (e.g. cancelled)
      // Because Appointment.slotId is @unique, we cannot assign the same slot.id to a second Appointment
      const existingApptOnSlot = await tx.appointment.findUnique({
        where: { slotId: slot.id },
      });

      if (existingApptOnSlot) {
        if (existingApptOnSlot.status !== 'CANCELLED') {
          throw new Error('This time slot is already booked. Please choose another slot.');
        }
        // Slot was freed from a cancelled appointment. Create a new slot to satisfy unique constraint.
        slot = await tx.appointmentSlot.create({
          data: {
            doctorId,
            slotDate: startOfDay,
            startTime,
            endTime: calculatedEndTime,
            status: 'BOOKED',
          },
        });
      } else {
        slot = await tx.appointmentSlot.update({
          where: { id: slot.id },
          data: {
            status: 'BOOKED',
            endTime: calculatedEndTime,
          },
        });
      }
    } else {
      slot = await tx.appointmentSlot.create({
        data: {
          doctorId,
          slotDate: startOfDay,
          startTime,
          endTime: calculatedEndTime,
          status: 'BOOKED',
        },
      });
    }

    // Generate unique human-readable appointment token
    const totalAppointments = await tx.appointment.count();
    const cleanDate = date.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const appointmentNumber = `APT-${cleanDate}-${String(totalAppointments + 1).padStart(3, '0')}-${randomSuffix}`;

    // Create Appointment record
    const newAppointment = await tx.appointment.create({
      data: {
        appointmentNumber,
        patientId: patient.id,
        doctorId,
        slotId: slot.id,
        appointmentDate: startOfDay,
        priority: priority || 'MEDIUM',
        status: 'SCHEDULED',
        reason: reason || 'General medical consultation',
      },
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        slot: true,
      },
    });

    return newAppointment;
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('appointment_created', {
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      appointmentNumber: appointment.appointmentNumber,
      appointmentDate: date,
      startTime: appointment.slot?.startTime,
      endTime: appointment.slot?.endTime,
      priority: appointment.priority,
      status: appointment.status,
    });
    // Invalidate AI forecast cache and notify listeners
    clearCache();
    io.emit('ai_forecast_updated', { type: 'APPOINTMENT_CREATED', doctorId: appointment.doctorId });
  }

  // Phase 11: Send asynchronous booking confirmation email
  sendBookingConfirmationEmail({
    to: appointment.patient?.user?.email,
    patientName: appointment.patient?.user?.name,
    appointmentNumber: appointment.appointmentNumber,
    doctorName: appointment.doctor?.user?.name,
    date: date,
    time: `${appointment.slot?.startTime} - ${appointment.slot?.endTime}`,
    cabin: appointment.doctor?.roomNumber,
  }).catch((e) => console.warn('Booking confirmation email notice:', e.message));

  return appointment;
};

/**
 * 3. Get appointments for the authenticated patient
 */
const getPatientAppointments = async (userId) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    throw new Error('Patient profile not found.');
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: {
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
      slot: true,
    },
    orderBy: {
      appointmentDate: 'desc',
    },
  });

  return appointments;
};

/**
 * 4. Get appointments for the authenticated doctor
 */
const getDoctorAppointments = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found.');
  }

  const appointments = await prisma.appointment.findMany({
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
      slot: true,
    },
    orderBy: {
      appointmentDate: 'desc',
    },
  });

  return appointments;
};

/**
 * 5. Get today's appointments for the authenticated doctor
 */
const getTodayDoctorAppointments = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found.');
  }

  // Calculate start and end of today
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;

  const startOfDay = new Date(`${todayDateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${todayDateStr}T23:59:59.999Z`);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
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
      slot: true,
    },
    orderBy: {
      slot: {
        startTime: 'asc',
      },
    },
  });

  return appointments;
};

/**
 * 6. Cancel an appointment (Patient or Doctor owner)
 */
const cancelAppointment = async (appointmentId, user) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true,
      slot: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  // Check ownership
  const isPatientOwner =
    user.role === 'PATIENT' && appointment.patient.userId === user.id;
  const isDoctorOwner =
    user.role === 'DOCTOR' && appointment.doctor.userId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
    throw new Error('Unauthorized: You do not own this appointment.');
  }

  if (appointment.status === 'CANCELLED') {
    throw new Error('Appointment is already cancelled.');
  }

  // Cancel in transaction and release the slot
  const updatedAppointment = await prisma.$transaction(async (tx) => {
    // 1. Mark appointment as CANCELLED
    const cancelled = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        slot: true,
      },
    });

    // 2. Free up the slot to AVAILABLE
    if (appointment.slotId) {
      await tx.appointmentSlot.update({
        where: { id: appointment.slotId },
        data: { status: 'AVAILABLE' },
      });
    }

    return cancelled;
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('appointment_cancelled', {
      appointmentId: updatedAppointment.id,
      doctorId: updatedAppointment.doctorId,
      patientId: updatedAppointment.patientId,
      appointmentDate: updatedAppointment.appointmentDate,
      startTime: updatedAppointment.slot?.startTime,
      endTime: updatedAppointment.slot?.endTime,
      status: 'CANCELLED',
    });
    clearCache();
    io.emit('ai_forecast_updated', { type: 'APPOINTMENT_CANCELLED', doctorId: updatedAppointment.doctorId });
  }

  const oldDateStr = appointment.appointmentDate.toISOString().split('T')[0];
  const oldStartTime = appointment.slot?.startTime;

  // Phase 11: Send asynchronous cancellation email
  sendCancellationEmail({
    to: updatedAppointment.patient?.user?.email,
    patientName: updatedAppointment.patient?.user?.name,
    appointmentNumber: updatedAppointment.appointmentNumber,
    doctorName: updatedAppointment.doctor?.user?.name,
    date: oldDateStr,
    time: oldStartTime,
  }).catch((e) => console.warn('Cancellation email notice:', e.message));

  // Phase 10: Automatic waitlist slot allocation upon cancellation
  let autoAllocationResult = null;

  if (oldStartTime) {
    try {
      const alloc = await smartAllocateSlot({
        doctorId: appointment.doctorId,
        appointmentDate: oldDateStr,
        startTime: oldStartTime,
      });
      if (alloc && alloc.allocated) {
        autoAllocationResult = alloc;
      }
    } catch (allocErr) {
      console.log('Post-cancellation automatic waitlist allocation check:', allocErr.message);
    }
  }

  return {
    ...updatedAppointment,
    autoAllocated: !!autoAllocationResult,
    allocatedPatient: autoAllocationResult?.selectedPatient || null,
  };
};

/**
 * 7. Update appointment status (Doctor only)
 */
const updateAppointmentStatus = async (appointmentId, userId, newStatus) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found.');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  if (appointment.doctorId !== doctor.id) {
    throw new Error('Unauthorized: You can only update appointments assigned to you.');
  }

  if (!VALID_APPOINTMENT_STATUSES.includes(newStatus)) {
    throw new Error(
      `Invalid appointment status '${newStatus}'. Must be one of: ${VALID_APPOINTMENT_STATUSES.join(', ')}`
    );
  }

  const updatedAppointment = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: newStatus },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        slot: true,
      },
    });

    // If doctor cancels the appointment, free up the slot
    if (newStatus === 'CANCELLED' && appointment.slotId) {
      await tx.appointmentSlot.update({
        where: { id: appointment.slotId },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    if (newStatus === 'CANCELLED') {
      io.emit('appointment_cancelled', {
        appointmentId: updatedAppointment.id,
        doctorId: updatedAppointment.doctorId,
        patientId: updatedAppointment.patientId,
        appointmentDate: appointment.appointmentDate,
        startTime: updatedAppointment.slot?.startTime,
        endTime: updatedAppointment.slot?.endTime,
        status: 'CANCELLED',
      });
    } else {
      io.emit('appointment_status_changed', {
        appointmentId: updatedAppointment.id,
        doctorId: updatedAppointment.doctorId,
        patientId: updatedAppointment.patientId,
        status: newStatus,
        appointmentDate: appointment.appointmentDate,
        startTime: updatedAppointment.slot?.startTime,
        endTime: updatedAppointment.slot?.endTime,
      });
    }
  }

  // Phase 10: Automatic waitlist slot allocation if doctor cancels the appointment
  let autoAllocationResult = null;
  if (newStatus === 'CANCELLED' && appointment.slotId) {
    const oldDateStr = appointment.appointmentDate.toISOString().split('T')[0];
    const oldStartTime = appointment.slot?.startTime;
    if (oldStartTime) {
      try {
        const alloc = await smartAllocateSlot({
          doctorId: appointment.doctorId,
          appointmentDate: oldDateStr,
          startTime: oldStartTime,
        });
        if (alloc && alloc.allocated) {
          autoAllocationResult = alloc;
        }
      } catch (allocErr) {
        console.log('Doctor cancel auto-allocation check:', allocErr.message);
      }
    }
  }

  return {
    ...updatedAppointment,
    autoAllocated: !!autoAllocationResult,
    allocatedPatient: autoAllocationResult?.selectedPatient || null,
  };
};

/**
 * 8. Reschedule an appointment (Patient owner, Doctor owner, or Admin) — Phase 10
 */
const rescheduleAppointment = async (
  appointmentId,
  user,
  { newDate, newStartTime, newEndTime, reason }
) => {
  if (!appointmentId) {
    throw new Error('Appointment ID is required.');
  }

  if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    throw new Error('Valid new appointment date (YYYY-MM-DD) is required.');
  }

  if (!newStartTime) {
    throw new Error('New start time is required.');
  }

  // 1. Fetch existing appointment with doctor, patient, and current slot
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      doctor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          availabilities: true,
        },
      },
      slot: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  // Check ownership
  const isPatientOwner = user.role === 'PATIENT' && appointment.patient.userId === user.id;
  const isDoctorOwner = user.role === 'DOCTOR' && appointment.doctor.userId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
    throw new Error('Unauthorized: You cannot reschedule this appointment.');
  }

  if (appointment.status === 'CANCELLED') {
    throw new Error('Cannot reschedule a cancelled appointment.');
  }

  if (appointment.status === 'COMPLETED') {
    throw new Error('Cannot reschedule an already completed appointment.');
  }

  // Verify doctor is not OFFLINE
  if (appointment.doctor.currentPresence === 'OFFLINE') {
    throw new Error('Doctor is currently OFFLINE and not accepting rescheduled appointments.');
  }

  // Verify doctor has an active schedule for the new day of week
  const dayOfWeek = getDayOfWeekFromDate(newDate);
  const activeSchedule = appointment.doctor.availabilities.find(
    (item) => item.dayOfWeek === dayOfWeek && item.isAvailable === true
  );

  if (!activeSchedule) {
    throw new Error(`Doctor is not scheduled to consult on ${dayOfWeek}.`);
  }

  // Calculate new end time if omitted
  const duration = appointment.doctor.consultationDuration || 30;
  const calculatedEndTime =
    newEndTime || minutesToTime(timeToMinutes(newStartTime) + duration);

  const newStartOfDay = new Date(`${newDate}T00:00:00.000Z`);
  const newEndOfDay = new Date(`${newDate}T23:59:59.999Z`);

  const oldSlotId = appointment.slotId;
  const oldDateStr = appointment.appointmentDate.toISOString().split('T')[0];
  const oldStartTime = appointment.slot?.startTime;

  // 2. Perform atomic transaction
  const updatedAppointment = await prisma.$transaction(async (tx) => {
    // Conflict check on doctor for new slot
    const doctorConflict = await tx.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        doctorId: appointment.doctorId,
        appointmentDate: {
          gte: newStartOfDay,
          lte: newEndOfDay,
        },
        slot: {
          startTime: newStartTime,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
    });

    if (doctorConflict) {
      throw new Error('The requested time slot is already booked. Please choose another slot.');
    }

    // Conflict check on patient for new slot
    const patientConflict = await tx.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        patientId: appointment.patientId,
        appointmentDate: {
          gte: newStartOfDay,
          lte: newEndOfDay,
        },
        slot: {
          startTime: newStartTime,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
    });

    if (patientConflict) {
      throw new Error('You already have another active appointment at this time slot.');
    }

    // Step A: Free the old slot
    if (oldSlotId) {
      await tx.appointmentSlot.update({
        where: { id: oldSlotId },
        data: { status: 'AVAILABLE' },
      });
    }

    // Step B: Find or create the new slot
    let newSlot = await tx.appointmentSlot.findFirst({
      where: {
        doctorId: appointment.doctorId,
        slotDate: {
          gte: newStartOfDay,
          lte: newEndOfDay,
        },
        startTime: newStartTime,
      },
    });

    if (newSlot) {
      const existingApptOnSlot = await tx.appointment.findUnique({
        where: { slotId: newSlot.id },
      });

      if (existingApptOnSlot && existingApptOnSlot.id !== appointmentId) {
        newSlot = await tx.appointmentSlot.create({
          data: {
            doctorId: appointment.doctorId,
            slotDate: newStartOfDay,
            startTime: newStartTime,
            endTime: calculatedEndTime,
            status: 'BOOKED',
          },
        });
      } else {
        newSlot = await tx.appointmentSlot.update({
          where: { id: newSlot.id },
          data: {
            status: 'BOOKED',
            endTime: calculatedEndTime,
          },
        });
      }
    } else {
      newSlot = await tx.appointmentSlot.create({
        data: {
          doctorId: appointment.doctorId,
          slotDate: newStartOfDay,
          startTime: newStartTime,
          endTime: calculatedEndTime,
          status: 'BOOKED',
        },
      });
    }

    // Step C: Update the appointment record
    const rescheduleNote = reason
      ? `Rescheduled from ${oldDateStr} ${oldStartTime || ''} to ${newDate} ${newStartTime} (Reason: ${reason})`
      : `Rescheduled from ${oldDateStr} ${oldStartTime || ''} to ${newDate} ${newStartTime}`;

    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        appointmentDate: newStartOfDay,
        slotId: newSlot.id,
        status: appointment.status === 'SCHEDULED' ? 'SCHEDULED' : 'CONFIRMED',
        notes: appointment.notes
          ? `${appointment.notes} | ${rescheduleNote}`
          : rescheduleNote,
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
        slot: true,
      },
    });

    return updated;
  });

  // Step D: Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('appointment_rescheduled', {
      appointmentId: updatedAppointment.id,
      doctorId: updatedAppointment.doctorId,
      patientId: updatedAppointment.patientId,
      oldDate: oldDateStr,
      oldStartTime,
      newDate,
      newStartTime,
      newEndTime: calculatedEndTime,
      appointmentNumber: updatedAppointment.appointmentNumber,
    });
    clearCache();
    io.emit('ai_forecast_updated', { type: 'APPOINTMENT_RESCHEDULED', doctorId: updatedAppointment.doctorId });
  }

  // Phase 11: Send asynchronous reschedule confirmation email
  sendRescheduleEmail({
    to: updatedAppointment.patient?.user?.email,
    patientName: updatedAppointment.patient?.user?.name,
    appointmentNumber: updatedAppointment.appointmentNumber,
    doctorName: updatedAppointment.doctor?.user?.name,
    oldDate: oldDateStr,
    oldTime: oldStartTime,
    newDate,
    newTime: `${newStartTime} - ${calculatedEndTime}`,
    cabin: appointment.doctor?.roomNumber,
  }).catch((e) => console.warn('Reschedule email notice:', e.message));

  // Step E: Auto-allocate the freed old slot if waitlist patients are queued!
  let autoAllocationResult = null;
  if (oldStartTime) {
    try {
      const alloc = await smartAllocateSlot({
        doctorId: appointment.doctorId,
        appointmentDate: oldDateStr,
        startTime: oldStartTime,
      });
      if (alloc && alloc.allocated) {
        autoAllocationResult = alloc;
      }
    } catch (e) {
      console.log('Post-reschedule auto-allocation check:', e.message);
    }
  }

  return {
    appointment: updatedAppointment,
    oldDate: oldDateStr,
    oldStartTime,
    newDate,
    newStartTime,
    autoAllocated: !!autoAllocationResult,
    allocatedPatient: autoAllocationResult?.selectedPatient || null,
  };
};

module.exports = {
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getTodayDoctorAppointments,
  cancelAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  VALID_APPOINTMENT_STATUSES,
};

