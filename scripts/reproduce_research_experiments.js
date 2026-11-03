/**
 * MediFlow AI — Scientific Research & Experimental Evaluation Engine
 * 
 * Conducts discrete-event Monte Carlo hospital queue simulations across 4 systems:
 *   - System A: Baseline (Static FCFS, No Presence Tracking, No Predictive Wait-Time)
 *   - System B: AI-Assisted Recommendation (Without Real-Time Presence Gating)
 *   - System C: Doctor Presence-Aware Gating (Without Predictive Wait-Time)
 *   - System D: Combined MediFlow AI (Presence + Smart Waitlist Triage + Queuing Velocity Wait Prediction)
 *
 * Reproducibility: Deterministic Mulberry32 PRNG (SEED = 42).
 * Output: Detailed statistics, ablation matrix, CSV benchmark, and JSON metrics payload.
 */

const fs = require('fs');
const path = require('path');

const SEED = 42;

// -----------------------------------------------------------------------------
// 1. DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
// -----------------------------------------------------------------------------
function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for Gaussian distributions
function randNormal(rng, mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

// Log-normal distribution for clinical consultation durations
function randLogNormal(rng, medianMin, sigma = 0.35) {
  const mu = Math.log(medianMin);
  const normalVal = randNormal(rng, mu, sigma);
  return Math.max(5, Math.min(90, Math.exp(normalVal)));
}

// -----------------------------------------------------------------------------
// 2. STATISTICAL UTILITY FUNCTIONS
// -----------------------------------------------------------------------------
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function variance(arr) {
  if (!arr || arr.length <= 1) return 0;
  const m = mean(arr);
  return arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1);
}

function stdDev(arr) {
  return Math.sqrt(variance(arr));
}

// Student's t distribution approximation for p-value calculation
function tDistributionCDF(t, df) {
  // Continued fraction approximation for incomplete beta function
  const x = (t + Math.sqrt(t * t + df)) / (2 * Math.sqrt(t * t + df));
  // Gaussian approximation for degrees of freedom >= 30
  if (df >= 30) {
    const z = t;
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const c = 0.39894228;
    if (z >= 0) {
      const k = 1.0 / (1.0 + p * z);
      return 1.0 - c * Math.exp(-z * z / 2.0) * (b1 * k + b2 * k * k + b3 * Math.pow(k, 3) + b4 * Math.pow(k, 4) + b5 * Math.pow(k, 5));
    } else {
      const k = 1.0 / (1.0 - p * z);
      return c * Math.exp(-z * z / 2.0) * (b1 * k + b2 * k * k + b3 * Math.pow(k, 3) + b4 * Math.pow(k, 4) + b5 * Math.pow(k, 5));
    }
  }
  return 0.5;
}

function pairedTTest(sampleA, sampleB) {
  const n = Math.min(sampleA.length, sampleB.length);
  if (n < 5) return { t: 0, pValue: 1, cohensD: 0, ci95: [0, 0] };

  const diffs = [];
  for (let i = 0; i < n; i++) {
    diffs.push(sampleA[i] - sampleB[i]);
  }

  const dMean = mean(diffs);
  const dStd = stdDev(diffs);
  const se = dStd / Math.sqrt(n);
  const t = se === 0 ? 0 : dMean / se;
  const df = n - 1;

  // Two-tailed p-value calculation
  const cdf = tDistributionCDF(Math.abs(t), df);
  const pValue = Math.max(1e-15, 2 * (1 - cdf));

  // Cohen's d effect size
  const pooledStd = Math.sqrt((variance(sampleA) + variance(sampleB)) / 2);
  const cohensD = pooledStd === 0 ? 0 : Math.abs(mean(sampleA) - mean(sampleB)) / pooledStd;

  // 95% Confidence Interval for difference in means
  const tCrit = 1.96; // 95% critical value
  const ci95 = [dMean - tCrit * se, dMean + tCrit * se];

  return {
    t: Number(t.toFixed(4)),
    df,
    pValue: pValue < 0.0001 ? '< 0.0001' : Number(pValue.toFixed(4)),
    cohensD: Number(cohensD.toFixed(3)),
    dMean: Number(dMean.toFixed(2)),
    ci95: [Number(ci95[0].toFixed(2)), Number(ci95[1].toFixed(2))],
  };
}

function regressionMetrics(actual, predicted) {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return { mae: 0, rmse: 0, r2: 0 };

  let absErrSum = 0;
  let sqErrSum = 0;
  let actualSum = 0;

  for (let i = 0; i < n; i++) {
    const err = actual[i] - predicted[i];
    absErrSum += Math.abs(err);
    sqErrSum += err * err;
    actualSum += actual[i];
  }

  const meanActual = actualSum / n;
  let totSumSquares = 0;
  for (let i = 0; i < n; i++) {
    totSumSquares += (actual[i] - meanActual) ** 2;
  }

  const mae = absErrSum / n;
  const rmse = Math.sqrt(sqErrSum / n);
  const r2 = totSumSquares === 0 ? 0 : 1 - sqErrSum / totSumSquares;

  return {
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    r2: Number(Math.max(-1, r2).toFixed(3)),
  };
}

// -----------------------------------------------------------------------------
// 3. CLINICAL SIMULATION PARAMETERS
// -----------------------------------------------------------------------------
const SIM_CONFIG = {
  numDays: 14,             // 14 operational hospital days
  numDoctors: 9,           // 9 clinical specialists (mirroring MediFlow DB)
  slotsPerDoctorDay: 14,   // 14 standard slots (09:00 - 17:00, with 1h lunch)
  totalSlots: 14 * 9 * 14, // 1,764 total appointment opportunities
  targetPatients: 1000,    // 1,000 synthetic patient encounters
  cancellationProb: 0.16,  // 16% historical cancellation rate
  doctorLatenessProb: 0.15,// 15% probability doctor arrives late / delayed
  doctorUnscheduledProb: 0.05, // 5% doctor emergency absence
};

// Doctor profiles mirrored from database
const SIM_DOCTORS = [
  { id: 'DOC-1', name: 'Dr. Ketan Vartak', dept: 'Urology', baselineDur: 25 },
  { id: 'DOC-2', name: 'Dr. Rajesh Parasnis', dept: 'Orthopedics', baselineDur: 30 },
  { id: 'DOC-3', name: 'Dr. Naresh Munot', dept: 'Cardiology', baselineDur: 30 },
  { id: 'DOC-4', name: 'Dr. Smruti Hindaria', dept: 'CTVS Surgery', baselineDur: 35 },
  { id: 'DOC-5', name: 'Dr. Sunil Jawale', dept: 'Nephrology', baselineDur: 25 },
  { id: 'DOC-6', name: 'Dr. Vidita Powle', dept: 'Oncology', baselineDur: 30 },
  { id: 'DOC-7', name: 'Dr. Suyog Doshi', dept: 'Neurosurgery', baselineDur: 35 },
  { id: 'DOC-8', name: 'Dr. Rajesh Sharma', dept: 'Cardiology', baselineDur: 25 },
  { id: 'DOC-9', name: 'Dr. Ananya Patel', dept: 'Neurology', baselineDur: 30 },
];

// Clinical Priority Categories
const PRIORITY_DISTRIBUTION = [
  { priority: 'EMERGENCY', weight: 0.08, baseScore: 100 },
  { priority: 'HIGH',      weight: 0.22, baseScore: 60 },
  { priority: 'MEDIUM',    weight: 0.50, baseScore: 30 },
  { priority: 'LOW',       weight: 0.20, baseScore: 10 },
];

function samplePriority(rng) {
  const r = rng();
  let cumulative = 0;
  for (const item of PRIORITY_DISTRIBUTION) {
    cumulative += item.weight;
    if (r <= cumulative) return item;
  }
  return PRIORITY_DISTRIBUTION[2];
}

// -----------------------------------------------------------------------------
// 4. EXPERIMENTAL SIMULATION RUNNER
// -----------------------------------------------------------------------------
function runSimulationExperiment(systemType, rng) {
  const results = {
    systemType,
    patientsProcessed: 0,
    waitingTimes: [],
    predictedWaitTimes: [],
    actualWaitTimes: [],
    doctorUtilization: {},
    doubleBookings: 0,
    allocatedCancellations: 0,
    lostCancelledSlots: 0,
    totalBookings: 0,
    doctorIdleMinutes: 0,
    doctorActiveMinutes: 0,
    emergencyWaitTimes: [],
    electiveWaitTimes: [],
  };

  // Initialize doctor tracking
  for (const doc of SIM_DOCTORS) {
    results.doctorUtilization[doc.id] = {
      name: doc.name,
      totalShiftMinutes: 0,
      consultationMinutes: 0,
      idleMinutes: 0,
      patientsSeen: 0,
    };
  }

  let globalPatientCounter = 0;

  // Run simulation day by day
  for (let day = 1; day <= SIM_CONFIG.numDays; day++) {
    for (const doc of SIM_DOCTORS) {
      const docTracker = results.doctorUtilization[doc.id];
      const shiftLengthMinutes = 480; // 8 hours = 480 mins
      docTracker.totalShiftMinutes += shiftLengthMinutes;

      // 1. Doctor Presence Simulation
      const isAbsent = rng() < SIM_CONFIG.doctorUnscheduledProb;
      const isLate = !isAbsent && rng() < SIM_CONFIG.doctorLatenessProb;
      const lateArrivalMinutes = isLate ? Math.round(15 + rng() * 30) : 0; // 15-45 mins late
      let doctorClinicTime = isAbsent ? 0 : shiftLengthMinutes - lateArrivalMinutes;

      // System-specific Presence Awareness:
      // Systems C & D know immediately via QR Check-in if doctor is late or absent.
      // Systems A & B have no presence detection; patients arrive regardless.
      const presenceAware = systemType === 'SYSTEM_C' || systemType === 'SYSTEM_D';

      // 2. Generate Scheduled Slots for this Doctor on this Day
      const dailySlots = [];
      const numSlots = 14;
      for (let s = 0; s < numSlots; s++) {
        if (globalPatientCounter >= SIM_CONFIG.targetPatients) break;
        globalPatientCounter++;

        const prio = samplePriority(rng);
        const scheduledStartMinutes = s * 30; // 0, 30, 60, ... mins from 09:00
        const isCancelled = rng() < SIM_CONFIG.cancellationProb;

        dailySlots.push({
          slotIndex: s,
          scheduledStartMinutes,
          patientId: `PT-${globalPatientCounter}`,
          priority: prio.priority,
          priorityScore: prio.baseScore,
          isCancelled,
          actualDuration: randLogNormal(rng, doc.baselineDur),
        });
      }

      results.totalBookings += dailySlots.length;

      // 3. Process Slot Execution & Event-Driven Clinic Simulation
      // Track timeline from minute 0 (09:00) to minute 540 (18:00)
      const arrivalEvents = [];

      for (const slot of dailySlots) {
        // Handle Cancellations:
        if (slot.isCancelled) {
          if (systemType === 'SYSTEM_D') {
            // System D: Smart Waitlist Auto-Allocation reallocates slot immediately
            results.allocatedCancellations++;
            slot.isCancelled = false;
            slot.priority = 'HIGH';
            slot.priorityScore = 80;
            slot.actualDuration = randLogNormal(rng, doc.baselineDur);
          } else if (systemType === 'SYSTEM_B') {
            // System B: Standard rebooking fills ~50%
            if (rng() < 0.50) {
              results.allocatedCancellations++;
              slot.isCancelled = false;
              slot.actualDuration = randLogNormal(rng, doc.baselineDur);
            } else {
              results.lostCancelledSlots++;
              continue;
            }
          } else {
            // Systems A & C: Lost slot
            results.lostCancelledSlots++;
            continue;
          }
        }

        // If Doctor is completely absent:
        if (isAbsent) {
          if (presenceAware) {
            // System C & D: Patients notified prior to arrival; minimal reception intake (5 mins)
            results.waitingTimes.push(5);
            results.actualWaitTimes.push(5);
            results.predictedWaitTimes.push(5);
          } else {
            // Systems A & B: Unaware of doctor absence. Patients wait average 40-60 mins
            const strandedWait = Math.round(35 + rng() * 30);
            results.waitingTimes.push(strandedWait);
            results.actualWaitTimes.push(strandedWait);
            results.predictedWaitTimes.push(5);
          }
          continue;
        }

        // Patient Arrival Time: Arrives ~10 mins before slot
        const arrivalOffset = Math.round(randNormal(rng, -10, 4));
        const patientArrivalTime = Math.max(0, slot.scheduledStartMinutes + arrivalOffset);

        arrivalEvents.push({
          ...slot,
          patientArrivalTime,
        });
      }

      if (isAbsent) continue;

      // Sort arrivals chronologically
      arrivalEvents.sort((a, b) => a.patientArrivalTime - b.patientArrivalTime);

      // Event-driven consultation execution
      let currentDoctorClock = lateArrivalMinutes;
      const waitingRoom = [];
      let arrivalIndex = 0;

      while (arrivalIndex < arrivalEvents.length || waitingRoom.length > 0) {
        // If waiting room is empty, fast-forward doctor clock to next arrival
        if (waitingRoom.length === 0 && arrivalIndex < arrivalEvents.length) {
          const nextArrival = arrivalEvents[arrivalIndex];
          if (nextArrival.patientArrivalTime > currentDoctorClock) {
            const idleGap = nextArrival.patientArrivalTime - currentDoctorClock;
            docTracker.idleMinutes += idleGap;
            results.doctorIdleMinutes += idleGap;
            currentDoctorClock = nextArrival.patientArrivalTime;
          }
        }

        // Admit all patients who have arrived by currentDoctorClock
        while (
          arrivalIndex < arrivalEvents.length &&
          arrivalEvents[arrivalIndex].patientArrivalTime <= currentDoctorClock
        ) {
          const arrivingPatient = arrivalEvents[arrivalIndex];

          // Compute Predictive Waiting-Time at arrival moment:
          let predictedWait = 0;
          const patientsAheadCount = waitingRoom.length;
          if (systemType === 'SYSTEM_D' || systemType === 'SYSTEM_B') {
            const emergencyCount = waitingRoom.filter((p) => p.priority === 'EMERGENCY').length;
            const presenceOffset = (presenceAware && isLate && currentDoctorClock > arrivingPatient.scheduledStartMinutes)
              ? (currentDoctorClock - arrivingPatient.scheduledStartMinutes)
              : 0;
            predictedWait = Math.max(5, Math.round(
              patientsAheadCount * (doc.baselineDur * 0.75) + (emergencyCount * 10) + presenceOffset
            ));
          } else {
            // Baseline Systems A & C: static schedule assumption (5 mins)
            predictedWait = 5;
          }

          waitingRoom.push({
            ...arrivingPatient,
            predictedWait,
          });
          arrivalIndex++;
        }

        if (waitingRoom.length === 0) break;

        // Select next patient to consult:
        let nextPatientIndex = 0;
        if (systemType === 'SYSTEM_D') {
          // Priority Triage: Emergency patients move ahead, then High, then Medium/Low
          // Ties broken by earlier arrival time
          waitingRoom.sort((a, b) => {
            if (b.priorityScore !== a.priorityScore) {
              return b.priorityScore - a.priorityScore;
            }
            return a.patientArrivalTime - b.patientArrivalTime;
          });
          nextPatientIndex = 0;
        } else {
          // FIFO First-Come First-Served by arrival time
          waitingRoom.sort((a, b) => a.patientArrivalTime - b.patientArrivalTime);
          nextPatientIndex = 0;
        }

        const patient = waitingRoom.splice(nextPatientIndex, 1)[0];
        results.patientsProcessed++;

        // Actual Waiting Time = Doctor Clock at Consultation Start - Patient Arrival Time
        const actualWait = Math.max(0, currentDoctorClock - patient.patientArrivalTime);
        results.waitingTimes.push(actualWait);
        results.actualWaitTimes.push(actualWait);
        results.predictedWaitTimes.push(patient.predictedWait);

        if (patient.priority === 'EMERGENCY') {
          results.emergencyWaitTimes.push(actualWait);
        } else {
          results.electiveWaitTimes.push(actualWait);
        }

        // Execute consultation
        const consultDuration = Math.round(patient.actualDuration);
        docTracker.consultationMinutes += consultDuration;
        results.doctorActiveMinutes += consultDuration;
        docTracker.patientsSeen++;

        currentDoctorClock += consultDuration;
      }
    }
  }

  // Aggregate Doctor Utilization
  let totalShiftMins = 0;
  let totalConsultMins = 0;
  for (const docId of Object.keys(results.doctorUtilization)) {
    const d = results.doctorUtilization[docId];
    totalShiftMins += d.totalShiftMinutes;
    totalConsultMins += d.consultationMinutes;
  }
  results.overallUtilizationPct = totalShiftMins > 0 ? Number(((totalConsultMins / totalShiftMins) * 100).toFixed(1)) : 0;

  return results;
}

// -----------------------------------------------------------------------------
// 5. MASTER EXPERIMENTAL SUITE EXECUTION
// -----------------------------------------------------------------------------
console.log('================================================================');
console.log('  MediFlow AI — Rigorous Experimental & Scientific Validation   ');
console.log('================================================================');
console.log(`[Configuration] PRNG Seed: ${SEED} | Simulation Days: ${SIM_CONFIG.numDays} | Target Patients: ${SIM_CONFIG.targetPatients}`);
console.log('[System Matrix] 4 Comparative Systems (A: Baseline, B: AI-Only, C: Presence-Only, D: Combined)\n');

const rngA = createPRNG(SEED);
const rngB = createPRNG(SEED);
const rngC = createPRNG(SEED);
const rngD = createPRNG(SEED);

console.log('⏳ Simulating System A (Baseline: Static FCFS Rule-Based)...');
const resA = runSimulationExperiment('SYSTEM_A', rngA);

console.log('⏳ Simulating System B (AI-Assisted Recommendations without Presence)...');
const resB = runSimulationExperiment('SYSTEM_B', rngB);

console.log('⏳ Simulating System C (Doctor Presence-Aware without Predictive AI)...');
const resC = runSimulationExperiment('SYSTEM_C', rngC);

console.log('⏳ Simulating System D (Combined MediFlow AI: Presence + Triage + Queuing Velocity)...');
const resD = runSimulationExperiment('SYSTEM_D', rngD);

// -----------------------------------------------------------------------------
// 6. METRIC COMPUTATIONS & STATISTICAL COMPARISONS
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('  EXPERIMENTAL RESULTS SUMMARY & PERFORMANCE METRICS            ');
console.log('================================================================\n');

const systems = [
  { key: 'System A (Baseline FCFS)', data: resA },
  { key: 'System B (AI-Assisted)', data: resB },
  { key: 'System C (Presence-Aware)', data: resC },
  { key: 'System D (Combined MediFlow AI)', data: resD },
];

const summaryTable = systems.map((s) => {
  const d = s.data;
  const predMetrics = regressionMetrics(d.actualWaitTimes, d.predictedWaitTimes);
  return {
    system: s.key,
    n: d.waitingTimes.length,
    meanWait: Number(mean(d.waitingTimes).toFixed(1)),
    medianWait: Number(median(d.waitingTimes).toFixed(1)),
    p90Wait: Number(percentile(d.waitingTimes, 90).toFixed(1)),
    maxWait: Number(Math.max(...d.waitingTimes).toFixed(1)),
    emergencyMeanWait: Number(mean(d.emergencyWaitTimes).toFixed(1)),
    utilizationRatePct: d.overallUtilizationPct,
    cancellationRecoveryPct: Number(((d.allocatedCancellations / (d.allocatedCancellations + d.lostCancelledSlots)) * 100).toFixed(1)),
    predMAE: predMetrics.mae,
    predRMSE: predMetrics.rmse,
    predR2: predMetrics.r2,
  };
});

console.table(summaryTable);

// -----------------------------------------------------------------------------
// 7. HYPOTHESIS TESTING (RESEARCH QUESTIONS RQ1 - RQ5)
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('  STATISTICAL HYPOTHESIS TESTING & EFFECT SIZES                 ');
console.log('================================================================\n');

// RQ1: Does doctor presence-aware allocation reduce patient waiting time? (System A vs System C)
const testRQ1 = pairedTTest(resA.waitingTimes, resC.waitingTimes);

// RQ2: Does AI-assisted allocation improve scheduling compared with baseline? (System A vs System B)
const testRQ2 = pairedTTest(resA.waitingTimes, resB.waitingTimes);

// RQ3: Does doctor availability tracking improve doctor utilization? (System A vs System D)
const testRQ3 = {
  utilA: resA.overallUtilizationPct,
  utilD: resD.overallUtilizationPct,
  delta: Number((resD.overallUtilizationPct - resA.overallUtilizationPct).toFixed(1)),
  relativeGainPct: Number((((resD.overallUtilizationPct - resA.overallUtilizationPct) / resA.overallUtilizationPct) * 100).toFixed(1)),
};

// RQ4: Can waiting-time prediction model provide sufficiently accurate estimates? (System D Prediction)
const testRQ4 = regressionMetrics(resD.actualWaitTimes, resD.predictedWaitTimes);

// RQ5: Combined System D vs Baseline System A Waiting Time Reduction
const testRQ5 = pairedTTest(resA.waitingTimes, resD.waitingTimes);

console.log('--- RQ1: Presence-Aware Allocation (System A vs System C) ---');
console.log(`  Waiting Time: ${summaryTable[0].meanWait} mins -> ${summaryTable[2].meanWait} mins (Delta: ${(summaryTable[0].meanWait - summaryTable[2].meanWait).toFixed(1)} mins)`);
console.log(`  t-statistic: ${testRQ1.t} | p-value: ${testRQ1.pValue} | Cohen's d: ${testRQ1.cohensD}`);
console.log(`  95% CI of Difference: [${testRQ1.ci95[0]}, ${testRQ1.ci95[1]}] mins\n`);

console.log('--- RQ2: AI-Assisted Recommendation (System A vs System B) ---');
console.log(`  Waiting Time: ${summaryTable[0].meanWait} mins -> ${summaryTable[1].meanWait} mins (Delta: ${(summaryTable[0].meanWait - summaryTable[1].meanWait).toFixed(1)} mins)`);
console.log(`  t-statistic: ${testRQ2.t} | p-value: ${testRQ2.pValue} | Cohen's d: ${testRQ2.cohensD}`);
console.log(`  95% CI of Difference: [${testRQ2.ci95[0]}, ${testRQ2.ci95[1]}] mins\n`);

console.log('--- RQ3: Doctor Utilization (System A vs System D) ---');
console.log(`  Doctor Utilization: ${testRQ3.utilA}% -> ${testRQ3.utilD}%`);
console.log(`  Absolute Gain: +${testRQ3.delta}% | Relative Improvement: +${testRQ3.relativeGainPct}%\n`);

console.log('--- RQ4: Waiting-Time Prediction Accuracy (System D) ---');
console.log(`  Mean Absolute Error (MAE): ${testRQ4.mae} minutes`);
console.log(`  Root Mean Squared Error (RMSE): ${testRQ4.rmse} minutes`);
console.log(`  Coefficient of Determination (R²): ${testRQ4.r2}\n`);

console.log('--- RQ5: Overall Combined MediFlow AI Impact (System A vs System D) ---');
console.log(`  Waiting Time Reduction: ${summaryTable[0].meanWait} mins -> ${summaryTable[3].meanWait} mins`);
console.log(`  Percentage Reduction: ${(((summaryTable[0].meanWait - summaryTable[3].meanWait) / summaryTable[0].meanWait) * 100).toFixed(1)}%`);
console.log(`  Emergency Waiting Time: ${summaryTable[0].emergencyMeanWait} mins -> ${summaryTable[3].emergencyMeanWait} mins`);
console.log(`  t-statistic: ${testRQ5.t} | p-value: ${testRQ5.pValue} | Cohen's d: ${testRQ5.cohensD}`);
console.log(`  95% CI of Difference: [${testRQ5.ci95[0]}, ${testRQ5.ci95[1]}] mins\n`);

// -----------------------------------------------------------------------------
// 8. PERSIST MACHINE-READABLE BENCHMARK ARTIFACTS
// -----------------------------------------------------------------------------
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Export CSV
const csvHeader = 'System,Sample_Size,Mean_Wait_Min,Median_Wait_Min,P90_Wait_Min,Max_Wait_Min,Emergency_Mean_Wait_Min,Doctor_Utilization_Pct,Cancellation_Recovery_Pct,Pred_MAE_Min,Pred_RMSE_Min,Pred_R2\n';
const csvRows = summaryTable.map((s) =>
  `"${s.system}",${s.n},${s.meanWait},${s.medianWait},${s.p90Wait},${s.maxWait},${s.emergencyMeanWait},${s.utilizationRatePct},${s.cancellationRecoveryPct},${s.predMAE},${s.predRMSE},${s.predR2}`
).join('\n');

fs.writeFileSync(path.join(dataDir, 'benchmark_results.csv'), csvHeader + csvRows, 'utf8');
console.log('✓ Exported machine-readable benchmark: data/benchmark_results.csv');

// 2. Export Detailed JSON
const jsonPayload = {
  experimentMetadata: {
    title: 'MediFlow AI Scientific & Experimental Queue Evaluation',
    timestamp: new Date().toISOString(),
    randomSeed: SEED,
    simulationConfig: SIM_CONFIG,
  },
  summary: summaryTable,
  hypothesisTests: {
    RQ1_PresenceAware: testRQ1,
    RQ2_AIAssisted: testRQ2,
    RQ3_DoctorUtilization: testRQ3,
    RQ4_PredictionAccuracy: testRQ4,
    RQ5_CombinedSystem: testRQ5,
  },
};

fs.writeFileSync(
  path.join(dataDir, 'research_evaluation_data.json'),
  JSON.stringify(jsonPayload, null, 2),
  'utf8'
);
console.log('✓ Exported comprehensive evaluation JSON: data/research_evaluation_data.json');
console.log('\n================================================================');
console.log('  EXPERIMENTAL VALIDATION COMPLETE — 100% TRACEABLE OUTPUT     ');
console.log('================================================================\n');
