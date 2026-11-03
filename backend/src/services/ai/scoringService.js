/**
 * Explainable Smart Slot Scoring Engine
 * Computes a weighted recommendation score (0 - 100) combining availability probability,
 * predicted queue wait time, clinic congestion density, and doctor clinical seniority.
 */

const SCORING_WEIGHTS = {
  AVAILABILITY: 35, // Doctor presence certainty
  WAIT_TIME: 25,    // Minimal queue delay
  DEMAND: 20,       // Off-peak comfort & convenience
  CLINICAL_EXP: 20, // Clinical specialist experience
};

/**
 * Score a single candidate slot
 * @param {Object} params
 * @param {number} params.availabilityProbability - Float [0.0 - 1.0]
 * @param {number} params.estimatedWaitMinutes - Integer
 * @param {boolean} params.isPeakSlot - Boolean
 * @param {number} params.loadRatio - Float [0.0 - 1.0]
 * @param {number} params.doctorExperienceYears - Integer
 * @param {boolean} params.isAvailable - Must be true (if false, score is 0)
 * @returns {Object} Score breakdown and badges
 */
const calculateSlotScore = ({
  availabilityProbability,
  estimatedWaitMinutes,
  isPeakSlot,
  loadRatio,
  doctorExperienceYears,
  isAvailable = true,
}) => {
  // Hard Constraint: Occupied or unavailable slots cannot be recommended
  if (!isAvailable || availabilityProbability <= 0) {
    return {
      totalScore: 0,
      breakdown: {
        availabilityScore: 0,
        waitTimeScore: 0,
        demandScore: 0,
        clinicalScore: 0,
      },
      badges: ['UNAVAILABLE'],
      isEligible: false,
      summary: 'Slot unavailable or outside doctor consulting schedule.',
    };
  }

  // 1. Availability Score (0 - 35)
  const availabilityScore = Math.round(
    Math.min(1.0, Math.max(0, availabilityProbability)) * SCORING_WEIGHTS.AVAILABILITY
  );

  // 2. Waiting Time Score (0 - 25)
  // 5 mins = 25 pts, 20 mins = 20 pts, 40 mins = 13 pts, >60 mins = 5 pts
  let waitTimeScore = 25;
  if (estimatedWaitMinutes > 5) {
    const penalty = Math.min(20, Math.round((estimatedWaitMinutes - 5) * 0.4));
    waitTimeScore = Math.max(5, 25 - penalty);
  }

  // 3. Demand & Comfort Score (0 - 20)
  // Calmer off-peak hours earn higher comfort points
  let demandScore = 15;
  if (loadRatio <= 0.35) {
    demandScore = 20; // Off-peak, minimal crowd
  } else if (loadRatio <= 0.65) {
    demandScore = 16; // Moderate
  } else {
    demandScore = 10; // Peak rush hour
  }

  // 4. Clinical Seniority Score (0 - 20)
  let clinicalScore = 12;
  const exp = doctorExperienceYears || 0;
  if (exp >= 12) {
    clinicalScore = 20;
  } else if (exp >= 7) {
    clinicalScore = 16;
  } else if (exp >= 3) {
    clinicalScore = 14;
  }

  // Total Score (0 - 100)
  const totalScore = Math.min(
    100,
    availabilityScore + waitTimeScore + demandScore + clinicalScore
  );

  // Recommendation Badges
  const badges = [];
  if (availabilityProbability >= 0.90) badges.push('HIGH_ATTENDANCE');
  if (estimatedWaitMinutes <= 10) badges.push('FASTEST_CONSULT');
  if (demandScore === 20) badges.push('OFF_PEAK_COMFORT');
  if (clinicalScore === 20) badges.push('SENIOR_SPECIALIST');

  // Summary phrase
  let summary = 'Recommended consultation slot.';
  if (totalScore >= 85) {
    summary = `Top-rated slot: High doctor presence confidence (${Math.round(
      availabilityProbability * 100
    )}%) and low expected wait (~${estimatedWaitMinutes} mins).`;
  } else if (totalScore >= 70) {
    summary = `Balanced slot with steady queue velocity (~${estimatedWaitMinutes} mins wait).`;
  }

  return {
    totalScore,
    maxScore: 100,
    breakdown: {
      availabilityScore,
      maxAvailability: SCORING_WEIGHTS.AVAILABILITY,
      waitTimeScore,
      maxWaitTime: SCORING_WEIGHTS.WAIT_TIME,
      demandScore,
      maxDemand: SCORING_WEIGHTS.DEMAND,
      clinicalScore,
      maxClinical: SCORING_WEIGHTS.CLINICAL_EXP,
    },
    badges,
    isEligible: true,
    summary,
  };
};

module.exports = {
  calculateSlotScore,
  SCORING_WEIGHTS,
};

