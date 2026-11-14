const prisma = require('../../config/db');
const mlServiceClient = require('./mlServiceClient');
const { getDayOfWeekFromDate } = require('../../utils/slotGenerator');

/**
 * Hybrid Waiting Time Estimation Engine — MediFlow AI 2.0
 * Combines physical queuing theory with Scikit-Learn regression ML adjustments.
 * 
 * Tier 1: Deterministic Queue Base (Queue Position * Doctor Velocity + Priority Buffer + Doctor Presence Drift)
 * Tier 2: Machine Learning Refinement (Random Forest Regressor on Department, Time of Day, Day of Week, Queue Length, Priority)
 * Graceful Fallback: If ML service is offline or returns insufficient data, seamlessly defaults to deterministic queue theory.
 */

/**
 * Estimate patient waiting time for a given doctor on a specific date and time slot.
 * @param {string} doctorId - Doctor UUID
 * @param {string} targetDate - YYYY-MM-DD
 * @param {string} [startTime] - HH:MM
 * @returns {Promise<Object>} Hybrid waiting time estimation payload
 */
const estimateWaitingTime = async (doctorId, targetDate, startTime = '10:00') => {
  if (!doctorId) {
    throw new Error('doctorId is required for waiting time estimation.');
  }
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error('Valid targetDate (YYYY-MM-DD) is required.');
  }

  // 1. Fetch Doctor profile with presence and department
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
    ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(appt.status)
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
  let presenceNote = 'Doctor present on standard duty';

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
        presenceNote = 'Doctor present and available';
    }
  }

  // 4. Tier 1: Deterministic Queue Base Formulation
  // Base Wait = (Pending Ahead * Average Duration * Efficiency) + (Emergency Priority Buffer) + Presence Offset
  const patientsAheadCount = pendingAhead.length;
  const emergencyBuffer = emergencyAhead.length * 10; // 10 mins extra buffer per emergency case

  let baseWaitMinutes = 0;
  if (patientsAheadCount === 0) {
    // For opening slot: 5 mins triage intake.
    // For later slots in the shift: factor in clinic intake and vitals recording pacing.
    const slotMins = toMins(startTime);
    let progressionBuffer = 0;
    if (slotMins >= 660 && slotMins < 780) { // 11:00 - 13:00
      progressionBuffer = 5;
    } else if (slotMins >= 780) { // 13:00+
      progressionBuffer = 10;
    }
    baseWaitMinutes = 5 + progressionBuffer + presenceOffset;
  } else {
    // 0.75 scaling factor accounts for clinical consultation overlap efficiency
    baseWaitMinutes = Math.round(
      patientsAheadCount * (durationPerPatient * 0.75) +
        emergencyBuffer +
        presenceOffset
    );
  }

  baseWaitMinutes = Math.max(5, baseWaitMinutes);

  // 5. Tier 2: Advisory Machine Learning Microservice Query
  const hour = startTime && startTime.includes(':') ? parseInt(startTime.split(':')[0], 10) : 10;
  const dayOfWeek = getDayOfWeekFromDate(targetDate) || 'MONDAY';

  let mlResult = null;
  try {
    mlResult = await mlServiceClient.predictWaitingTime({
      doctorId: doctor.id,
      department: doctor.department || 'General Medicine',
      dayOfWeek,
      hourOfDay: hour,
      queueLengthAhead: patientsAheadCount,
      priorityLevel: emergencyAhead.length > 0 ? 'HIGH' : 'MEDIUM',
    });
  } catch (err) {
    mlResult = {
      status: 'insufficient_data',
      predicted_wait_minutes: null,
      source: 'ml-service-fallback',
      explanation: [`ML service fallback: ${err.message}`],
    };
  }

  // 6. Tier 3: Hybrid Blending, Sanity Clamping & Explainability
  let finalWaitMinutes = baseWaitMinutes;
  let source = 'QUEUE_FALLBACK';
  let modelMode = 'DETERMINISTIC_QUEUE_SIMULATION';
  let isFallback = true;
  let explanationText = '';

  const hasValidML =
    mlResult &&
    mlResult.predicted_wait_minutes !== null &&
    mlResult.predicted_wait_minutes !== undefined &&
    !isNaN(mlResult.predicted_wait_minutes);

  if (hasValidML) {
    const mlWait = Number(mlResult.predicted_wait_minutes);

    // Hybrid formula: 60% Queue Velocity + 40% ML Regression Drift
    if (patientsAheadCount === 0) {
      finalWaitMinutes = Math.round(0.70 * baseWaitMinutes + 0.30 * mlWait);
    } else {
      finalWaitMinutes = Math.round(0.60 * baseWaitMinutes + 0.40 * mlWait);
    }

    source = 'HYBRID_ML_QUEUE';
    modelMode = mlResult.model_mode || 'DEVELOPMENT_BENCHMARK';
    isFallback = false;

    explanationText =
      patientsAheadCount === 0
        ? `No patients queued ahead for Dr. ${doctor.user.name} at ${startTime}. Hybrid AI intake estimate is ~${finalWaitMinutes} mins (Base Queue: ${baseWaitMinutes}m, ML Refinement: ${mlWait}m).`
        : `${patientsAheadCount} patient(s) scheduled ahead of slot ${startTime}. Hybrid AI prediction balances clinical queue velocity with Random Forest regression (~${finalWaitMinutes} mins; Base Queue: ${baseWaitMinutes}m, ML Refinement: ${mlWait}m).`;
  } else {
    // Pure Queue Deterministic Fallback
    finalWaitMinutes = baseWaitMinutes;
    source = 'QUEUE_FALLBACK';
    modelMode = 'DETERMINISTIC_QUEUE_SIMULATION';
    isFallback = true;

    explanationText =
      patientsAheadCount === 0
        ? `No patients queued ahead for Dr. ${doctor.user.name} at ${startTime}. Queue baseline estimate is ~${finalWaitMinutes} mins (deterministic queue fallback).`
        : `${patientsAheadCount} patient(s) scheduled ahead at ${startTime}. Estimated wait is ~${finalWaitMinutes} mins based on ${durationPerPatient}-min slots (deterministic queue fallback).`;
  }

  // Strict Sanity Clamping: Never negative, realistic minimum 5 mins
  finalWaitMinutes = Math.max(5, finalWaitMinutes);
  const minRange = Math.max(5, finalWaitMinutes - 5);
  const maxRange = finalWaitMinutes + 8;

  // Confidence assessment
  const confidence = sameDayAppointments.length >= 2 ? 'HIGH' : 'ESTIMATED_BASELINE';

  return {
    doctorId: doctor.id,
    doctorName: doctor.user.name,
    department: doctor.department,
    targetDate,
    startTime,
    queuePosition: patientsAheadCount + 1,
    patientsAhead: patientsAheadCount,
    estimatedWaitMinutes: finalWaitMinutes,
    formattedWaitRange: `${minRange} - ${maxRange} mins`,
    confidence,
    source,
    modelMode,
    isFallback,
    breakdown: {
      baseQueueWait: baseWaitMinutes,
      mlPredictedWait: hasValidML ? Number(mlResult.predicted_wait_minutes) : null,
      totalAppointmentsBookedOnDate: sameDayAppointments.length,
      appointmentsAhead: appointmentsAhead.length,
      pendingAhead: patientsAheadCount,
      completedAhead: completedAhead.length,
      emergencyPrioritiesAhead: emergencyAhead.length,
      doctorConsultationDuration: durationPerPatient,
      presenceOffset,
      presenceNote,
    },
    mlAdvisory: mlResult,
    explanation: explanationText,
  };
};

module.exports = {
  estimateWaitingTime,
};
