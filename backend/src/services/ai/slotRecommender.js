const prisma = require('../../config/db');
const { predictDoctorAvailability, DAYS_OF_WEEK } = require('./availabilityPredictor');
const { estimateWaitingTime } = require('./waitingTimeEstimator');
const { getSlotDemandPatterns } = require('./demandForecaster');
const { calculateSlotScore } = require('./scoringService');

/**
 * Smart Slot Recommendation Engine
 * Discovers and ranks open consultation slots for patients using explainable AI scoring.
 */

/**
 * Recommend top available appointment slots based on patient criteria.
 * @param {Object} options
 * @param {string} [options.specialization] - Medical specialization
 * @param {string} [options.department] - Medical department
 * @param {string} [options.preferredDate] - YYYY-MM-DD
 * @param {string} [options.doctorId] - Specific Doctor UUID
 * @param {number} [options.limit=5] - Number of recommendations to return
 * @returns {Promise<Object>} Smart recommendations with detailed breakdown
 */
const getRecommendedSlots = async ({
  specialization,
  department,
  preferredDate,
  doctorId,
  limit = 5,
} = {}) => {
  // 1. Build Doctor Query
  const doctorWhere = {};
  if (doctorId) {
    doctorWhere.id = doctorId;
  } else {
    if (specialization) {
      doctorWhere.specialization = {
        contains: specialization,
        mode: 'insensitive',
      };
    }
    if (department) {
      doctorWhere.department = {
        contains: department,
        mode: 'insensitive',
      };
    }
  }

  const candidateDoctors = await prisma.doctor.findMany({
    where: doctorWhere,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      availabilities: true,
    },
  });

  if (candidateDoctors.length === 0) {
    return {
      success: true,
      count: 0,
      recommendations: [],
      message: 'No medical specialists found matching the requested criteria.',
    };
  }

  // 2. Determine target dates to scan
  const targetDates = [];
  if (preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    targetDates.push(preferredDate);
    // Also include next 2 days to provide flexible alternatives
    const pDate = new Date(preferredDate);
    for (let i = 1; i <= 2; i++) {
      const nextD = new Date(pDate);
      nextD.setDate(pDate.getDate() + i);
      targetDates.push(nextD.toISOString().split('T')[0]);
    }
  } else {
    // Default: scan the upcoming 5 days
    const today = new Date();
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      targetDates.push(d.toISOString().split('T')[0]);
    }
  }

  // Cache slot demand patterns
  const demandPatternCache = {};

  const candidateScoredSlots = [];

  // 3. Scan slots for each doctor across target dates
  for (const doc of candidateDoctors) {
    // Skip if doctor has no active availability days at all
    const activeDays = doc.availabilities.filter((a) => a.isAvailable);
    if (activeDays.length === 0) continue;

    if (!demandPatternCache[doc.id]) {
      demandPatternCache[doc.id] = await getSlotDemandPatterns(doc.id);
    }
    const slotPatterns = demandPatternCache[doc.id].slotPatterns;

    for (const dateStr of targetDates) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = DAYS_OF_WEEK[dateObj.getUTCDay()];

      const schedule = doc.availabilities.find(
        (a) => a.dayOfWeek === dayOfWeek && a.isAvailable
      );
      if (!schedule) continue; // Doctor doesn't consult on this day

      // Generate discrete 30-min candidate slots within shift
      const toMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const toTimeStr = (mins) => {
        const h = String(Math.floor(mins / 60)).padStart(2, '0');
        const m = String(mins % 60).padStart(2, '0');
        return `${h}:${m}`;
      };

      const startMins = toMinutes(schedule.startTime);
      const endMins = toMinutes(schedule.endTime);
      const duration = doc.consultationDuration || 30;

      // Query already booked appointments for this doctor on this date
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const bookedAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: doc.id,
          appointmentDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            notIn: ['CANCELLED'],
          },
        },
        include: { slot: true },
      });

      const bookedStartTimes = new Set(
        bookedAppointments.map((a) => a.slot?.startTime).filter(Boolean)
      );

      // Evaluate each discrete time window
      for (let cur = startMins; cur + duration <= endMins; cur += duration) {
        const slotStart = toTimeStr(cur);
        const slotEnd = toTimeStr(cur + duration);

        // Conflict check: slot must be strictly unbooked
        if (bookedStartTimes.has(slotStart)) {
          continue; // Occupied, cannot recommend
        }

        // Run AI Availability Predictor
        const availPrediction = await predictDoctorAvailability(
          doc.id,
          dateStr,
          slotStart
        );
        if (availPrediction.probability <= 0.25) {
          continue; // Low availability confidence, skip
        }

        // Run AI Waiting Time Estimator
        const waitEstimate = await estimateWaitingTime(
          doc.id,
          dateStr,
          slotStart
        );

        // Find demand pattern for this slot
        const pattern =
          slotPatterns.find((p) => p.slotTime === slotStart) || {
            loadRatio: 0.3,
            isPeak: false,
          };

        // Run Explainable Scoring Engine
        const scoring = calculateSlotScore({
          availabilityProbability: availPrediction.probability,
          estimatedWaitMinutes: waitEstimate.estimatedWaitMinutes,
          isPeakSlot: pattern.isPeak,
          loadRatio: pattern.loadRatio,
          doctorExperienceYears: doc.experience,
          isAvailable: true,
        });

        if (scoring.isEligible && scoring.totalScore >= 50) {
          candidateScoredSlots.push({
            doctorId: doc.id,
            doctorName: doc.user.name,
            specialization: doc.specialization,
            department: doc.department,
            consultationFee: doc.consultationFee,
            consultationDuration: duration,
            roomNumber: doc.roomNumber,
            date: dateStr,
            dayOfWeek,
            startTime: slotStart,
            endTime: slotEnd,
            aiScore: scoring.totalScore,
            scoreBreakdown: scoring.breakdown,
            badges: scoring.badges,
            availabilityProbability: availPrediction.probability,
            availabilityConfidence: availPrediction.confidence,
            estimatedWaitMinutes: waitEstimate.estimatedWaitMinutes,
            formattedWaitRange: waitEstimate.formattedWaitRange,
            queuePosition: waitEstimate.queuePosition,
            recommendationReason: scoring.summary,
            aiExplanation: `${scoring.summary} (Doctor availability certainty: ${Math.round(
              availPrediction.probability * 100
            )}%, Expected queue wait: ~${waitEstimate.estimatedWaitMinutes} mins).`,
          });
        }
      }
    }
  }

  // 4. Sort descending by AI Recommendation Score
  candidateScoredSlots.sort((a, b) => b.aiScore - a.aiScore);

  const topRecommendations = candidateScoredSlots.slice(0, Number(limit));

  return {
    success: true,
    count: topRecommendations.length,
    scannedSlots: candidateScoredSlots.length,
    recommendations: topRecommendations,
    meta: {
      algorithm: 'v1.0-explainable-multi-factor-scoring',
      weights: {
        availabilityCertainty: '35%',
        minimalWaitTime: '25%',
        offPeakComfort: '20%',
        specialistExperience: '20%',
      },
      note: 'AI scores are purely advisory. Booking confirmation is strictly enforced by the core conflict-prevention booking engine.',
    },
  };
};

module.exports = {
  getRecommendedSlots,
};

