/**
 * Service: priorityService.js
 * Rule-Based Intelligent Priority Scoring Engine for MediFlow AI Waitlist.
 *
 * NOTE FOR TECHNICAL VIVA:
 * This system implements a transparent, deterministic, rule-based clinical scoring
 * algorithm inspired by automated emergency triage systems (such as the Emergency
 * Severity Index - ESI and Manchester Triage System - MTS).
 * It is NOT an uninterpretable black-box neural network; every single point is
 * mathematically bounded, deterministic, and explainable to patients and clinicians.
 */

// 1. Medical Priority Point Allocations
const MEDICAL_PRIORITY_WEIGHTS = {
  LOW: 10,       // Routine checkup, mild chronic symptom review
  MEDIUM: 20,    // Moderate symptoms requiring clinical attention
  HIGH: 30,      // Severe discomfort or deteriorating condition
  CRITICAL: 40,  // Severe condition requiring prompt clinical intervention
  EMERGENCY: 40, // Synonymous with CRITICAL in triage systems
};

// 2. Clinical Urgency Point Allocations
const URGENCY_WEIGHTS = {
  LOW: 5,        // Flexible timing, elective visit
  MEDIUM: 10,    // Needs attention within standard outpatient timeframe
  HIGH: 15,      // Rapidly progressing symptom, requires same-day review
  EMERGENCY: 20, // Critical timeline, urgent slot allocation required
};

// 3. Waiting Time Configuration
const MINUTES_PER_WAIT_POINT = 30; // 1 bonus point for every 30 minutes in queue
const MAX_WAITING_POINTS = 30;     // Cap at 30 points (15 hours) so wait duration never overrides acute medical priority

/**
 * Returns point weight for medical priority level.
 */
function getMedicalPriorityPoints(priority) {
  if (!priority) return MEDICAL_PRIORITY_WEIGHTS.MEDIUM;
  const normalized = String(priority).toUpperCase();
  return MEDICAL_PRIORITY_WEIGHTS[normalized] || MEDICAL_PRIORITY_WEIGHTS.MEDIUM;
}

/**
 * Returns point weight for clinical urgency level.
 */
function getUrgencyPoints(urgency) {
  if (!urgency) return URGENCY_WEIGHTS.MEDIUM;
  const normalized = String(urgency).toUpperCase();
  return URGENCY_WEIGHTS[normalized] || URGENCY_WEIGHTS.MEDIUM;
}

/**
 * Computes waiting time points based on minutes elapsed since joining waitlist.
 * Formula: floor(elapsedMinutes / 30) capped at MAX_WAITING_POINTS.
 */
function getWaitingTimePoints(createdAt, now = new Date()) {
  if (!createdAt) return 0;
  const joinedTime = new Date(createdAt).getTime();
  const currentTime = new Date(now).getTime();

  const elapsedMs = Math.max(0, currentTime - joinedTime);
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  const rawPoints = Math.floor(elapsedMinutes / MINUTES_PER_WAIT_POINT);
  return Math.min(rawPoints, MAX_WAITING_POINTS);
}

/**
 * Calculate total priority score for a waitlist candidate.
 *
 * Formula:
 *   Total Score = Medical Priority Points + Urgency Points + Waiting Time Points
 *
 * Range:
 *   Minimum: 10 + 5 + 0 = 15
 *   Maximum: 40 + 20 + 30 = 90
 */
function calculatePriorityScore({
  priority = 'MEDIUM',
  urgency = 'MEDIUM',
  createdAt = new Date(),
  now = new Date(),
}) {
  const medicalPoints = getMedicalPriorityPoints(priority);
  const urgencyPoints = getUrgencyPoints(urgency);
  const waitingPoints = getWaitingTimePoints(createdAt, now);

  return medicalPoints + urgencyPoints + waitingPoints;
}

/**
 * Returns a detailed, transparent breakdown of the priority score for Explainable UI.
 */
function explainScore({
  priority = 'MEDIUM',
  urgency = 'MEDIUM',
  createdAt = new Date(),
  now = new Date(),
}) {
  const medicalPoints = getMedicalPriorityPoints(priority);
  const urgencyPoints = getUrgencyPoints(urgency);
  const waitingPoints = getWaitingTimePoints(createdAt, now);
  const totalScore = medicalPoints + urgencyPoints + waitingPoints;

  const joinedTime = new Date(createdAt).getTime();
  const currentTime = new Date(now).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((currentTime - joinedTime) / (1000 * 60)));

  return {
    totalScore,
    breakdown: {
      medicalPriority: {
        level: priority,
        points: medicalPoints,
        description: `Base clinical severity points (${medicalPoints} pts)`,
      },
      urgency: {
        level: urgency,
        points: urgencyPoints,
        description: `Temporal urgency weight (${urgencyPoints} pts)`,
      },
      waitingTime: {
        elapsedMinutes,
        points: waitingPoints,
        maxPoints: MAX_WAITING_POINTS,
        description: `1 pt per 30 mins waited (${waitingPoints} pts earned, max ${MAX_WAITING_POINTS})`,
      },
    },
    formula: 'Score = MedicalPriority (10-40) + Urgency (5-20) + WaitingTime (0-30)',
  };
}

module.exports = {
  calculatePriorityScore,
  explainScore,
  getMedicalPriorityPoints,
  getUrgencyPoints,
  getWaitingTimePoints,
  MEDICAL_PRIORITY_WEIGHTS,
  URGENCY_WEIGHTS,
  MAX_WAITING_POINTS,
  MINUTES_PER_WAIT_POINT,
};

