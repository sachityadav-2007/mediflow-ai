const prisma = require('../../config/db');

/**
 * Waiting Time Estimation Engine
 * Calculates expected patient waiting duration based on queue position,
 * doctor consultation velocity, clinical priority triage, and live clinic presence.
 */

/**
 * Estimate patient waiting time for a given doctor on a specific date and time slot.
 * @param {string} doctorId - Doctor UUID
 * @param {string} targetDate - YYYY-MM-DD
 * @param {string} [startTime] - HH:MM
 * @returns {Promise<Object>} Waiting time estimation payload
 */
const estimateWaitingTime = async (doctorId, targetDate, startTime = '10:00') => {
  if (!doctorId) {
    throw new Error('doctorId is required for waiting time estimation.');
  }
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error('Valid targetDate (YYYY-MM-DD) is required.');
  }

  // 1. Fetch Doctor profile with presence
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { name: true } },
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  const durationPerPatient = doctor.consultationDuration || 30;

  // 2. Query all scheduled appointments for this doctor on targetDate
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

  const sameDayAppointments = await prisma.appointment.findMany({
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
      slot: { select: { startTime: true, endTime: true } },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Convert HH:MM to minutes from midnight
  const toMins = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const requestedSlotMins = toMins(startTime);

  // Filter patients queued ahead of requested slot time
  const appointmentsAhead = sameDayAppointments.filter((appt) => {
    const slotMins = toMins(appt.slot?.startTime);
    return slotMins < requestedSlotMins;
  });

  // Count active pending consultations ahead (excluding completed)
  const pendingAhead = appointmentsAhead.filter((appt) =>
    ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status)
  );

  const completedAhead = appointmentsAhead.filter(
    (appt) => appt.status === 'COMPLETED'
  );

  const emergencyAhead = pendingAhead.filter((appt) =>
    ['HIGH', 'EMERGENCY'].includes(appt.priority)
  );

  // 3. Live Presence offset (applicable if target date is today)
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = targetDate === todayStr;

  let presenceOffset = 0;
  let presenceNote = 'Normal queue progression';

  if (isToday) {
    switch (doctor.currentPresence) {
      case 'ON_BREAK':
      case 'AWAY':
        presenceOffset = 15;
        presenceNote = 'Doctor currently away on break (+15 mins)';
        break;
      case 'IN_CONSULTATION':
      case 'BUSY':
        presenceOffset = 8;
        presenceNote = 'Doctor in active consultation';
        break;
      case 'OFFLINE':
      case 'ON_LEAVE':
        presenceOffset = 30;
        presenceNote = 'Doctor currently offline';
        break;
      default:
        presenceOffset = 0;
    }
  }

  // 4. Mathematical Estimation Formulation
  // Estimated Wait = (Pending Ahead * Average Duration) + (Emergency Priority Buffer) + Presence Offset
  const patientsAheadCount = pendingAhead.length;
  const emergencyBuffer = emergencyAhead.length * 10; // 10 mins extra buffer per emergency case

  let estimatedMinutes = 0;
  if (patientsAheadCount === 0) {
    // Zero queue: minimal check-in / triage intake duration (5 mins)
    estimatedMinutes = 5 + presenceOffset;
  } else {
    // 0.85 scaling factor considers clinical efficiency overlap
    estimatedMinutes = Math.round(
      patientsAheadCount * (durationPerPatient * 0.75) +
        emergencyBuffer +
        presenceOffset
    );
  }

  // Cap minimum at 5 mins, realistic max
  estimatedMinutes = Math.max(5, estimatedMinutes);
  const minRange = Math.max(5, estimatedMinutes - 5);
  const maxRange = estimatedMinutes + 10;

  // Confidence assessment
  const confidence = sameDayAppointments.length >= 2 ? 'HIGH' : 'ESTIMATED_BASELINE';

  return {
    doctorId: doctor.id,
    doctorName: doctor.user.name,
    targetDate,
    startTime,
    queuePosition: patientsAheadCount + 1,
    patientsAhead: patientsAheadCount,
    estimatedWaitMinutes: estimatedMinutes,
    formattedWaitRange: `${minRange} - ${maxRange} mins`,
    confidence,
    breakdown: {
      totalAppointmentsBookedOnDate: sameDayAppointments.length,
      appointmentsAhead: appointmentsAhead.length,
      pendingAhead: patientsAheadCount,
      completedAhead: completedAhead.length,
      emergencyPrioritiesAhead: emergencyAhead.length,
      doctorConsultationDuration: durationPerPatient,
      presenceOffset,
      presenceNote,
    },
    explanation:
      patientsAheadCount === 0
        ? `No patients currently queued ahead for Dr. ${doctor.user.name} at ${startTime}. Expected intake & vitals duration is ~${estimatedMinutes} mins.`
        : `${patientsAheadCount} patient(s) scheduled ahead of your slot time (${startTime}). Based on ${durationPerPatient}-min consultation slots and clinic velocity, your estimated wait is ~${estimatedMinutes} mins (${minRange}-${maxRange} mins).`,
  };
};

module.exports = {
  estimateWaitingTime,
};

