const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { calculatePriorityScore, explainScore } = require('./priorityService');

/**
 * Smart Allocation Engine
 * Automatically assigns an available appointment slot to the highest-priority
 * eligible waitlisted patient using our transparent rule-based algorithm.
 */
const smartAllocateSlot = async ({
  doctorId,
  appointmentDate,
  startTime,
  endTime,
}) => {
  if (!doctorId || !appointmentDate || !startTime) {
    throw new Error('doctorId, appointmentDate, and startTime are required for slot allocation.');
  }

  // Normalize date
  const startOfDay = new Date(`${appointmentDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${appointmentDate}T23:59:59.999Z`);

  // 1. Verify doctor exists
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  // 2. Validate slot availability (not already booked by an active appointment)
  const existingActiveAppointment = await prisma.appointment.findFirst({
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

  if (existingActiveAppointment) {
    throw new Error('This appointment slot is already booked and cannot be allocated.');
  }

  // 3. Find all active (PENDING) waitlist patients for this doctor
  const waitlistCandidates = await prisma.waitlist.findMany({
    where: {
      doctorId,
      status: 'PENDING',
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  if (waitlistCandidates.length === 0) {
    return {
      success: true,
      allocated: false,
      message: 'No active waitlist patients found for this doctor.',
      doctorName: doctor.user.name,
      appointmentDate,
      startTime,
    };
  }

  // 4. Calculate dynamic priority scores for all candidates
  const now = new Date();
  const scoredCandidates = waitlistCandidates.map((entry) => {
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

  // 5. Filter out candidates who already have an active appointment on this date with this doctor
  const eligibleCandidates = [];
  for (const candidate of scoredCandidates) {
    const hasConflict = await prisma.appointment.findFirst({
      where: {
        patientId: candidate.patientId,
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

    if (!hasConflict) {
      eligibleCandidates.push(candidate);
    }
  }

  if (eligibleCandidates.length === 0) {
    return {
      success: true,
      allocated: false,
      message: 'All waitlisted patients already have an active appointment for this date.',
      doctorName: doctor.user.name,
    };
  }

  // 6. Sort Candidates:
  //    Primary: Highest currentScore (DESC)
  //    Secondary (Tie-Breaker): Earliest joined time (createdAt ASC)
  eligibleCandidates.sort((a, b) => {
    if (b.currentScore !== a.currentScore) {
      return b.currentScore - a.currentScore;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const winner = eligibleCandidates[0];

  // 7. Atomic Allocation Transaction
  const allocationResult = await prisma.$transaction(async (tx) => {
    // Re-verify the winner is still PENDING
    const currentEntry = await tx.waitlist.findUnique({
      where: { id: winner.id },
    });

    if (!currentEntry || currentEntry.status !== 'PENDING') {
      throw new Error('Selected candidate is no longer active on the waitlist.');
    }

    // Re-verify slot is still free
    const recheckSlotConflict = await tx.appointment.findFirst({
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

    if (recheckSlotConflict) {
      throw new Error('Slot was reserved by a concurrent booking.');
    }

    // Find or create AppointmentSlot
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
        throw new Error('Appointment slot is already booked.');
      }
      slot = await tx.appointmentSlot.update({
        where: { id: slot.id },
        data: {
          status: 'BOOKED',
          endTime: endTime || slot.endTime,
        },
      });
    } else {
      slot = await tx.appointmentSlot.create({
        data: {
          doctorId,
          slotDate: startOfDay,
          startTime,
          endTime: endTime || '10:30',
          status: 'BOOKED',
        },
      });
    }

    // Generate unique appointment token
    const totalCount = await tx.appointment.count();
    const cleanDate = appointmentDate.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const appointmentNumber = `APT-${cleanDate}-${String(totalCount + 1).padStart(3, '0')}-${randomSuffix}`;

    // Create Appointment for waitlist patient
    const appointment = await tx.appointment.create({
      data: {
        appointmentNumber,
        patientId: winner.patientId,
        doctorId,
        slotId: slot.id,
        appointmentDate: startOfDay,
        priority: winner.priority,
        status: 'CONFIRMED',
        reason: `Smart Waitlist Allocated (Score: ${winner.currentScore} pts) - ${winner.notes || 'Automated triage allocation'}`,
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

    // Mark winner's waitlist record as ALLOCATED
    const updatedWaitlist = await tx.waitlist.update({
      where: { id: winner.id },
      data: {
        status: 'ALLOCATED',
        priorityScore: winner.currentScore,
      },
    });

    return {
      appointment,
      updatedWaitlist,
    };
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('appointment_allocated', {
      appointmentId: allocationResult.appointment.id,
      doctorId: allocationResult.appointment.doctorId,
      patientId: allocationResult.appointment.patientId,
      appointmentNumber: allocationResult.appointment.appointmentNumber,
      appointmentDate,
      startTime: allocationResult.appointment.slot?.startTime,
      endTime: allocationResult.appointment.slot?.endTime,
      priorityScore: winner.currentScore,
    });

    io.emit('waitlist_updated', {
      waitlistId: winner.id,
      doctorId: allocationResult.appointment.doctorId,
      patientId: allocationResult.appointment.patientId,
      status: 'ALLOCATED',
      action: 'ALLOCATED',
    });
  }

  return {
    success: true,
    allocated: true,
    selectedPatient: {
      patientId: winner.patientId,
      name: winner.patient.user.name,
      email: winner.patient.user.email,
      phone: winner.patient.user.phone,
      waitlistId: winner.id,
    },
    priorityScore: winner.currentScore,
    explanation: winner.explanation,
    appointment: allocationResult.appointment,
    updatedWaitlistStatus: allocationResult.updatedWaitlist.status,
    remainingWaitlistCount: eligibleCandidates.length - 1,
  };
};

module.exports = {
  smartAllocateSlot,
};

