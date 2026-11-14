const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { calculatePriorityScore, explainScore } = require('./priorityService');
const { createNotification, notifyAdmins } = require('./notificationService');
const { generateTimeSlots, getDayOfWeekFromDate } = require('../utils/slotGenerator');

/**
 * Smart Allocation Engine — MediFlow AI
 * 
 * Manages intelligent, rule-based appointment allocation and waitlist matching:
 * 1. Scans open/available appointment slots from doctor schedules, cancellations, or reschedules.
 * 2. Matches eligible waitlisted patients based on doctor/department compatibility, preferred date, and clinical priority.
 * 3. Applies transparent, deterministic priority scoring (Medical Priority + Clinical Urgency + Waiting Time Duration).
 * 4. Prevents duplicate bookings, conflicting patient schedules, and race conditions via ACID transactions.
 * 5. Provides transparent allocation recommendations to administrators for review or automated safe assignment.
 * 6. Dispatches real-time Socket.IO broadcasts and in-app notifications.
 */

/**
 * Format elapsed waiting duration in human-readable format (e.g. "2h 15m")
 */
function formatWaitDuration(createdAt, now = new Date()) {
  if (!createdAt) return '0m';
  const elapsedMs = Math.max(0, new Date(now).getTime() - new Date(createdAt).getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m in queue`;
  }
  return `${minutes}m in queue`;
}

/**
 * 1. Get Intelligent Allocation Recommendations for Open Slots & Waitlisted Patients
 * 
 * Inspects available slots across doctors (or a specific doctor), finds eligible waitlisted candidates,
 * computes deterministic priority scores with breakdowns, verifies clinical compatibility,
 * and recommends the highest-scoring candidate for administrator review.
 * 
 * @param {Object} options
 * @param {string} [options.doctorId] - Optional doctor filter
 * @param {string} [options.appointmentDate] - Optional date (defaults to today)
 * @returns {Promise<Object>} Recommendation payload
 */
const getAllocationRecommendations = async ({ doctorId, appointmentDate } = {}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = appointmentDate || todayStr;
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
  const dayOfWeek = getDayOfWeekFromDate(targetDate);
  const now = new Date();

  // 1. Fetch doctors matching filter with their working schedule and pending waitlists
  const doctorWhere = {};
  if (doctorId && doctorId !== 'ALL') {
    doctorWhere.id = doctorId;
  }

  const doctors = await prisma.doctor.findMany({
    where: doctorWhere,
    include: {
      user: { select: { id: true, name: true, email: true } },
      availabilities: true,
      waitlists: {
        where: { status: 'PENDING' },
        include: {
          patient: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const recommendations = [];
  let totalOpenSlots = 0;
  let totalPendingWaitlist = 0;

  for (const doc of doctors) {
    totalPendingWaitlist += doc.waitlists.length;

    // Check doctor schedule for this day
    const scheduleForDay = doc.availabilities.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isAvailable === true
    );

    if (!scheduleForDay) {
      continue;
    }

    // Generate potential time slots for this shift
    const duration = doc.consultationDuration || 30;
    const possibleSlots = generateTimeSlots(
      scheduleForDay.startTime,
      scheduleForDay.endTime,
      duration
    );

    // Query active booked appointments for this doctor on target date
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doc.id,
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        slot: { select: { startTime: true } },
      },
    });

    const bookedStartTimes = new Set(
      bookedAppointments.map((a) => a.slot?.startTime).filter(Boolean)
    );

    // Filter to available slots
    const availableSlots = possibleSlots.filter(
      (slot) => !bookedStartTimes.has(slot.startTime)
    );

    totalOpenSlots += availableSlots.length;

    if (doc.waitlists.length === 0 || availableSlots.length === 0) {
      continue;
    }

    // Score and evaluate all pending waitlist candidates for this doctor
    const scoredCandidates = doc.waitlists.map((entry) => {
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

      const waitDuration = formatWaitDuration(entry.createdAt, now);

      return {
        waitlistId: entry.id,
        patientId: entry.patientId,
        patientName: entry.patient.user.name,
        patientEmail: entry.patient.user.email,
        patientPhone: entry.patient.user.phone,
        preferredDate: entry.preferredDate,
        medicalPriority: entry.priority,
        urgency: entry.urgency,
        priorityScore: currentScore,
        notes: entry.notes || '',
        createdAt: entry.createdAt,
        waitDuration,
        explanation,
      };
    });

    // Check compatibility and conflicts for each available slot
    for (const slot of availableSlots) {
      // Find eligible candidates with no schedule conflicts
      const eligibleForSlot = [];

      for (const candidate of scoredCandidates) {
        // 1. Conflict check: does patient already have an appointment on this date with this doctor?
        const doctorConflict = await prisma.appointment.findFirst({
          where: {
            patientId: candidate.patientId,
            doctorId: doc.id,
            appointmentDate: { gte: startOfDay, lte: endOfDay },
            status: { notIn: ['CANCELLED'] },
          },
        });

        if (doctorConflict) continue;

        // 2. Conflict check: does patient have a concurrent appointment with ANY doctor at this exact time?
        const timeConflict = await prisma.appointment.findFirst({
          where: {
            patientId: candidate.patientId,
            appointmentDate: { gte: startOfDay, lte: endOfDay },
            slot: { startTime: slot.startTime },
            status: { notIn: ['CANCELLED'] },
          },
        });

        if (timeConflict) continue;

        eligibleForSlot.push({
          ...candidate,
          compatibility: {
            doctorMatch: true,
            departmentMatch: true,
            preferredDateMatch: candidate.preferredDate
              ? new Date(candidate.preferredDate).toISOString().split('T')[0] === targetDate
              : true,
            noTimeConflict: true,
            doctorPresence: doc.currentPresence,
          },
        });
      }

      if (eligibleForSlot.length > 0) {
        // Sort: highest priority score first, then FIFO by joined time
        eligibleForSlot.sort((a, b) => {
          if (b.priorityScore !== a.priorityScore) {
            return b.priorityScore - a.priorityScore;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        const recommended = eligibleForSlot[0];
        const runnerUps = eligibleForSlot.slice(1, 4); // Up to 3 runner-ups

        recommendations.push({
          slot: {
            doctorId: doc.id,
            doctorName: doc.user.name,
            department: doc.department || 'General Medicine',
            specialization: doc.specialization,
            roomNumber: doc.roomNumber || 'Room 101',
            date: targetDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            doctorPresence: doc.currentPresence,
          },
          recommendedPatient: recommended,
          eligibleCount: eligibleForSlot.length,
          runnerUps,
        });
      }
    }
  }

  return {
    success: true,
    targetDate,
    totalOpenSlots,
    totalPendingWaitlist,
    recommendationsCount: recommendations.length,
    recommendations,
  };
};

/**
 * 2. Smart Slot Allocation Execution (Transparent & Safe)
 * 
 * Assigns an open appointment slot to a waitlist candidate.
 * If `waitlistId` is provided (e.g. confirmed by Administrator), allocates that candidate.
 * If omitted, automatically selects the highest-scoring eligible candidate.
 * 
 * Enforces strict transactional safety:
 * - Checks slot is not already booked.
 * - Checks candidate is active (PENDING).
 * - Checks candidate has no concurrent appointment conflicts.
 * - Updates slot, appointment, and waitlist records atomically.
 * - Pushes real-time Socket.IO and in-app notifications.
 */
const smartAllocateSlot = async ({
  doctorId,
  appointmentDate,
  startTime,
  endTime,
  waitlistId = null,
}) => {
  if (!doctorId) {
    throw new Error('doctorId is required for slot allocation.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = appointmentDate || todayStr;
  const targetStart = startTime || '10:00';
  const targetEnd = endTime || '10:30';

  // Normalize date boundaries
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

  // 1. Verify doctor exists
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { id: true, name: true, email: true } },
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
        startTime: targetStart,
      },
      status: {
        notIn: ['CANCELLED'],
      },
    },
  });

  if (existingActiveAppointment) {
    throw new Error('This appointment slot is already booked and cannot be allocated.');
  }

  // 3. Find candidates
  let candidateWhere = {
    doctorId,
    status: 'PENDING',
  };

  if (waitlistId) {
    candidateWhere.id = waitlistId;
  }

  const waitlistCandidates = await prisma.waitlist.findMany({
    where: candidateWhere,
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
      message: waitlistId
        ? 'Selected waitlist candidate was not found or is no longer pending.'
        : 'No active waitlist patients found for this doctor.',
      doctorName: doctor.user.name,
      appointmentDate: targetDate,
      startTime: targetStart,
    };
  }

  // 4. Calculate dynamic priority scores for candidates
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
  //    or a conflicting appointment with any doctor at this exact start time
  const eligibleCandidates = [];
  for (const candidate of scoredCandidates) {
    const hasDoctorConflict = await prisma.appointment.findFirst({
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

    if (hasDoctorConflict) continue;

    const hasTimeConflict = await prisma.appointment.findFirst({
      where: {
        patientId: candidate.patientId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        slot: {
          startTime: targetStart,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
    });

    if (hasTimeConflict) continue;

    eligibleCandidates.push(candidate);
  }

  if (eligibleCandidates.length === 0) {
    return {
      success: true,
      allocated: false,
      message: 'Waitlisted patient(s) have an active appointment or scheduling conflict for this date/time.',
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
          startTime: targetStart,
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
        startTime: targetStart,
      },
    });

    if (slot) {
      if (slot.status === 'BOOKED') {
        throw new Error('Appointment slot is already booked.');
      }

      // Check if slot was previously attached to a cancelled appointment
      const existingApptOnSlot = await tx.appointment.findUnique({
        where: { slotId: slot.id },
      });

      if (existingApptOnSlot) {
        slot = await tx.appointmentSlot.create({
          data: {
            doctorId,
            slotDate: startOfDay,
            startTime: targetStart,
            endTime: targetEnd,
            status: 'BOOKED',
          },
        });
      } else {
        slot = await tx.appointmentSlot.update({
          where: { id: slot.id },
          data: {
            status: 'BOOKED',
            endTime: targetEnd || slot.endTime,
          },
        });
      }
    } else {
      slot = await tx.appointmentSlot.create({
        data: {
          doctorId,
          slotDate: startOfDay,
          startTime: targetStart,
          endTime: targetEnd,
          status: 'BOOKED',
        },
      });
    }

    // Generate unique appointment token
    const totalCount = await tx.appointment.count();
    const cleanDate = targetDate.replace(/-/g, '');
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

  // 8. Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    io.emit('appointment_allocated', {
      appointmentId: allocationResult.appointment.id,
      doctorId: allocationResult.appointment.doctorId,
      doctorName: doctor.user.name,
      patientId: allocationResult.appointment.patientId,
      patientName: winner.patient.user.name,
      appointmentNumber: allocationResult.appointment.appointmentNumber,
      appointmentDate: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
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

  // 9. Dispatch in-app notifications
  try {
    // Notify the patient
    if (winner.patient.user?.id) {
      await createNotification({
        userId: winner.patient.user.id,
        type: 'WAITLIST_ALLOCATED',
        title: '🎉 Appointment Allocated from Waitlist!',
        message: `Good news! A slot has opened with Dr. ${doctor.user.name} on ${targetDate} at ${targetStart}. Your appointment #${allocationResult.appointment.appointmentNumber} is confirmed.`,
        metadata: {
          appointmentId: allocationResult.appointment.id,
          appointmentNumber: allocationResult.appointment.appointmentNumber,
          doctorId: doctor.id,
          slotTime: targetStart,
          date: targetDate,
          priorityScore: winner.currentScore,
        },
      });
    }

    // Notify the doctor
    if (doctor.user?.id) {
      await createNotification({
        userId: doctor.user.id,
        type: 'WAITLIST_ALLOCATED',
        title: 'New Patient Allocated from Waitlist',
        message: `Patient ${winner.patient.user.name} was allocated to your open slot on ${targetDate} at ${targetStart} (Priority Score: ${winner.currentScore} pts).`,
        metadata: {
          appointmentId: allocationResult.appointment.id,
          patientId: winner.patientId,
          slotTime: targetStart,
        },
      });
    }

    // Notify Admins
    await notifyAdmins({
      type: 'WAITLIST_ALLOCATED',
      title: 'Smart Waitlist Slot Allocated',
      message: `Dr. ${doctor.user.name}'s slot (${targetDate} ${targetStart}) was allocated to ${winner.patient.user.name} (Score: ${winner.currentScore} pts).`,
      metadata: {
        appointmentId: allocationResult.appointment.id,
        waitlistId: winner.id,
      },
    });
  } catch (notifErr) {
    console.warn('[SmartAllocateSlot] In-app notification dispatch notice:', notifErr.message);
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

/**
 * 3. Doctor Availability & Opportunity Detection
 * 
 * Invoked when a doctor becomes AVAILABLE or PRESENT (via QR check-in or status toggle).
 * Checks if the doctor has active waitlisted patients and open slots today.
 * If found, emits `waitlist_opportunity_detected` to notify administrators in real-time.
 */
const checkAndNotifyWaitlistOpportunity = async (doctorId) => {
  if (!doctorId) return null;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const recommendationsResult = await getAllocationRecommendations({
      doctorId,
      appointmentDate: todayStr,
    });

    if (
      recommendationsResult.success &&
      recommendationsResult.recommendationsCount > 0
    ) {
      const topRec = recommendationsResult.recommendations[0];
      const io = getIO();
      if (io) {
        io.emit('waitlist_opportunity_detected', {
          doctorId,
          doctorName: topRec.slot.doctorName,
          department: topRec.slot.department,
          specialization: topRec.slot.specialization,
          targetDate: todayStr,
          openSlotsCount: recommendationsResult.totalOpenSlots,
          pendingCandidatesCount: recommendationsResult.totalPendingWaitlist,
          recommendedPatient: {
            name: topRec.recommendedPatient.patientName,
            priority: topRec.recommendedPatient.medicalPriority,
            score: topRec.recommendedPatient.priorityScore,
            slotTime: topRec.slot.startTime,
          },
          timestamp: new Date(),
        });
      }

      // Notify hospital administrators
      await notifyAdmins({
        type: 'SYSTEM_ALERT',
        title: 'Doctor Available — Waitlist Allocation Opportunity',
        message: `Dr. ${topRec.slot.doctorName} is now AVAILABLE with ${recommendationsResult.totalOpenSlots} open slot(s). Candidate ${topRec.recommendedPatient.patientName} (${topRec.recommendedPatient.priorityScore} pts) is eligible for allocation.`,
        metadata: {
          doctorId,
          openSlots: recommendationsResult.totalOpenSlots,
          candidates: recommendationsResult.totalPendingWaitlist,
        },
      });

      return recommendationsResult;
    }
  } catch (err) {
    console.warn('[checkAndNotifyWaitlistOpportunity] Error checking opportunity:', err.message);
  }

  return null;
};

module.exports = {
  getAllocationRecommendations,
  smartAllocateSlot,
  checkAndNotifyWaitlistOpportunity,
};
