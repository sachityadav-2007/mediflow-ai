const prisma = require('../../config/db');

/**
 * Doctor Availability Prediction Engine
 * Evaluates recurring weekly schedules, live presence state, historical presence logs,
 * and past appointment completion/cancellation ratios to compute an explainable probability.
 */

const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Predict availability probability for a specific doctor on a target date and time.
 * @param {string} doctorId - Doctor UUID
 * @param {string} targetDate - Date string (YYYY-MM-DD)
 * @param {string} [startTime] - Slot start time (HH:MM)
 * @returns {Promise<Object>} Availability prediction payload
 */
const predictDoctorAvailability = async (doctorId, targetDate, startTime = null) => {
  if (!doctorId) {
    throw new Error('Doctor ID is required for availability prediction.');
  }
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error('Valid targetDate (YYYY-MM-DD) is required.');
  }

  // 1. Fetch Doctor with credentials and recurring availabilities
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { name: true, email: true } },
      availabilities: true,
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  // Determine target Day of Week
  const [year, month, day] = targetDate.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = DAYS_OF_WEEK[targetDateObj.getUTCDay()];

  // Check today's date
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isTargetToday = targetDate === todayStr;

  // 2. Schedule Check: Is the doctor scheduled to work on this day of week?
  const matchingSchedule = doctor.availabilities.find(
    (a) => a.dayOfWeek === dayOfWeek && a.isAvailable === true
  );

  let isWithinWorkingHours = true;
  if (matchingSchedule && startTime) {
    const toMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMins = toMins(startTime);
    const schedStart = toMins(matchingSchedule.startTime);
    const schedEnd = toMins(matchingSchedule.endTime);
    if (startMins < schedStart || startMins >= schedEnd) {
      isWithinWorkingHours = false;
    }
  }

  // If doctor has NO scheduled hours on this day or slot is outside shift:
  if (!matchingSchedule || !isWithinWorkingHours) {
    return {
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      specialization: doctor.specialization,
      department: doctor.department,
      targetDate,
      dayOfWeek,
      startTime: startTime || 'All-Day',
      probability: 0.0,
      confidence: 'HIGH',
      confidenceScore: 0.95,
      isScheduled: false,
      isWithinHours: isWithinWorkingHours,
      statusPrediction: 'OFFLINE_UNSCHEDULED',
      metrics: {
        isScheduled: false,
        attendanceRatio: 0,
        cancellationRate: 0,
        sampleSize: 0,
        historicalSessions: 0,
      },
      explanation: !matchingSchedule
        ? `Dr. ${doctor.user.name} is not scheduled to consult on ${dayOfWeek}s.`
        : `Requested slot (${startTime}) falls outside Dr. ${doctor.user.name}'s consulting shift (${matchingSchedule.startTime} - ${matchingSchedule.endTime}).`,
    };
  }

  // 3. Historical Attendance from Presence Logs
  const presenceLogs = await prisma.presenceLog.findMany({
    where: { doctorId },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  const totalPresenceEvents = presenceLogs.length;
  let attendanceRatio = 0.90; // Default empirical baseline if fresh doctor
  let isBaseline = totalPresenceEvents < 3;

  if (totalPresenceEvents >= 3) {
    const positiveEvents = presenceLogs.filter((log) =>
      ['PRESENT', 'AVAILABLE', 'IN_CONSULTATION', 'BUSY'].includes(log.status)
    ).length;
    attendanceRatio = positiveEvents / totalPresenceEvents;
  }

  // 4. Historical Appointment Reliability & Cancellation Penalty
  const totalAppointments = await prisma.appointment.count({
    where: { doctorId },
  });

  const cancelledAppointments = await prisma.appointment.count({
    where: {
      doctorId,
      status: 'CANCELLED',
    },
  });

  let cancellationRate = 0.05; // 5% baseline
  if (totalAppointments >= 3) {
    cancellationRate = cancelledAppointments / totalAppointments;
  }

  const reliabilityFactor = Math.max(0.5, 1 - cancellationRate * 0.7);

  // 5. Current Live Presence Weighting (higher impact if target date is today)
  let currentPresenceFactor = 1.0;
  if (isTargetToday) {
    switch (doctor.currentPresence) {
      case 'PRESENT':
      case 'AVAILABLE':
        currentPresenceFactor = 1.0;
        break;
      case 'BUSY':
      case 'IN_CONSULTATION':
        currentPresenceFactor = 0.95;
        break;
      case 'ON_BREAK':
      case 'AWAY':
        currentPresenceFactor = 0.80;
        break;
      case 'OFFLINE':
      case 'ON_LEAVE':
        currentPresenceFactor = 0.15;
        break;
      default:
        currentPresenceFactor = 0.85;
    }
  }

  // 6. Probability Synthesis
  let probabilityRaw;
  if (isTargetToday) {
    probabilityRaw =
      0.45 * currentPresenceFactor +
      0.35 * attendanceRatio +
      0.20 * reliabilityFactor;
  } else {
    // Future date relies on recurring schedule adherence, historical presence and reliability
    probabilityRaw =
      0.65 * attendanceRatio +
      0.35 * reliabilityFactor;
  }

  // Ensure bounded probability [0.05, 0.99]
  const probability = Math.min(0.99, Math.max(0.05, probabilityRaw));

  // Determine Confidence Level
  const sampleSize = totalPresenceEvents + totalAppointments;
  let confidence = 'HIGH';
  let confidenceScore = 0.88;

  if (sampleSize < 3) {
    confidence = 'LOW_BASELINE';
    confidenceScore = 0.55;
  } else if (sampleSize < 8) {
    confidence = 'MEDIUM';
    confidenceScore = 0.72;
  }

  // Human-readable status tag
  let statusPrediction = 'HIGHLY_LIKELY_AVAILABLE';
  if (probability < 0.35) statusPrediction = 'UNLIKELY_AVAILABLE';
  else if (probability < 0.70) statusPrediction = 'MODERATELY_AVAILABLE';

  // Construct transparent explanation for college viva
  const pct = Math.round(probability * 100);
  const cancelPct = Math.round(cancellationRate * 100);
  const attendPct = Math.round(attendanceRatio * 100);

  let explanation = `Doctor has an active ${matchingSchedule.startTime}-${matchingSchedule.endTime} shift on ${dayOfWeek}s. `;
  if (isTargetToday) {
    explanation += `Live clinic status is currently ${doctor.currentPresence}. `;
  }
  explanation += `Historical clinic presence rate is ${attendPct}%, with an appointment cancellation rate of ${cancelPct}%. Predicted availability: ${pct}%.`;
  if (isBaseline) {
    explanation += ` (Statistical baseline applied due to limited historical session data).`;
  }

  return {
    doctorId: doctor.id,
    doctorName: doctor.user.name,
    specialization: doctor.specialization,
    department: doctor.department,
    targetDate,
    dayOfWeek,
    startTime: startTime || 'All-Day',
    probability: Number(probability.toFixed(3)),
    percentage: pct,
    confidence,
    confidenceScore,
    isScheduled: true,
    isWithinHours: true,
    statusPrediction,
    metrics: {
      isScheduled: true,
      attendanceRatio: Number(attendanceRatio.toFixed(3)),
      cancellationRate: Number(cancellationRate.toFixed(3)),
      currentPresence: doctor.currentPresence,
      sampleSize,
      historicalSessions: totalPresenceEvents,
      historicalAppointments: totalAppointments,
      isBaseline,
    },
    explanation,
  };
};

module.exports = {
  predictDoctorAvailability,
  DAYS_OF_WEEK,
};

