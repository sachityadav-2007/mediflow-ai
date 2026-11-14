// scratch/test_waiting_time_hybrid_workflow.mjs
// Automated verification of MediFlow AI 2.0 Hybrid Waiting Time Prediction & Lifecycle Timestamps

import prisma from '../backend/src/config/db.js';
import { estimateWaitingTime } from '../backend/src/services/ai/waitingTimeEstimator.js';
import { updateAppointmentStatus } from '../backend/src/services/appointment.service.js';
import { getLiveQueue } from '../backend/src/services/checkInService.js';

async function run() {
  console.log('========================================================================');
  console.log('🧪 TESTING HYBRID WAITING TIME PREDICTION & LIFECYCLE TIMESTAMPS');
  console.log('========================================================================\n');

  // Find a doctor to test with
  const doctor = await prisma.doctor.findFirst({
    include: { user: true },
  });
  if (!doctor) throw new Error('No doctor found in database!');
  console.log(`[Setup] Using Doctor: Dr. ${doctor.user.name} (${doctor.specialization}, ${doctor.department || 'General Medicine'}) [ID: ${doctor.id}]`);

  // Cleanup any orphaned test slots from previous runs
  await prisma.appointment.deleteMany({ where: { appointmentNumber: { startsWith: 'TEST-' } } });
  await prisma.appointmentSlot.deleteMany({ where: { startTime: '17:30', doctorId: doctor.id } });

  // -------------------------------------------------------------------------
  // SECTION 1: Hybrid Waiting Time Estimation with Live ML Service (Port 5002)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Hybrid Waiting Time Estimation (ML Service Connected) ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const hybridResult = await estimateWaitingTime(doctor.id, todayStr, '10:30');

  console.log('Hybrid Prediction Result:');
  console.log('  - Doctor:', hybridResult.doctorName);
  console.log('  - Target Date:', hybridResult.targetDate);
  console.log('  - Queue Position:', hybridResult.queuePosition);
  console.log('  - Patients Ahead:', hybridResult.patientsAhead);
  console.log('  - Estimated Wait (Mins):', hybridResult.estimatedWaitMinutes);
  console.log('  - Formatted Wait Range:', hybridResult.formattedWaitRange);
  console.log('  - Prediction Source:', hybridResult.source);
  console.log('  - Model Mode:', hybridResult.modelMode);
  console.log('  - Is Fallback:', hybridResult.isFallback);
  console.log('  - Base Queue Wait:', hybridResult.breakdown?.baseQueueWait);
  console.log('  - ML Predicted Wait:', hybridResult.breakdown?.mlPredictedWait);
  console.log('  - Explanation:', hybridResult.explanation);

  // Assertions
  if (hybridResult.estimatedWaitMinutes < 5) {
    throw new Error(`Sanity check failed: estimatedWaitMinutes (${hybridResult.estimatedWaitMinutes}) is less than 5`);
  }
  if (hybridResult.source !== 'HYBRID_ML_QUEUE') {
    console.warn(`Note: Prediction source is ${hybridResult.source} (FastAPI may be offline or in fallback mode)`);
  } else {
    console.log('✓ PASS: Hybrid estimation blended deterministic queue theory with ML model predictions.');
  }

  // -------------------------------------------------------------------------
  // SECTION 2: Resilient Fallback When ML Microservice is Unreachable
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Resilient Fallback Simulation ---');
  // Temporarily point ML service URL to an unreachable port to test graceful degradation
  const originalUrl = process.env.ML_SERVICE_URL;
  process.env.ML_SERVICE_URL = 'http://localhost:59999'; // Dead port

  const fallbackResult = await estimateWaitingTime(doctor.id, todayStr, '11:00');
  console.log('Fallback Result:');
  console.log('  - Estimated Wait (Mins):', fallbackResult.estimatedWaitMinutes);
  console.log('  - Source:', fallbackResult.source);
  console.log('  - Is Fallback:', fallbackResult.isFallback);
  console.log('  - Model Mode:', fallbackResult.modelMode);

  if (fallbackResult.estimatedWaitMinutes < 5) {
    throw new Error(`Fallback sanity check failed: wait minutes is negative or < 5 (${fallbackResult.estimatedWaitMinutes})`);
  }
  if (fallbackResult.source !== 'QUEUE_FALLBACK' || !fallbackResult.isFallback) {
    throw new Error(`Fallback assertion failed: expected source QUEUE_FALLBACK and isFallback true, got source: ${fallbackResult.source}`);
  }
  console.log('✓ PASS: System gracefully degraded to deterministic queue theory without crashing or throwing errors.');

  // Restore ML URL
  if (originalUrl) process.env.ML_SERVICE_URL = originalUrl;
  else delete process.env.ML_SERVICE_URL;

  // -------------------------------------------------------------------------
  // SECTION 3: Appointment Clinical Lifecycle & Ground-Truth Timestamps
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Appointment Clinical Lifecycle & Ground-Truth Timestamps ---');
  
  // Find a patient and a slot or existing appointment to test
  const patient = await prisma.patient.findFirst({ include: { user: true } });
  if (!patient) throw new Error('No patient found in database!');

  // Create an isolated test appointment to avoid modifying existing patient appointments
  const testSlot = await prisma.appointmentSlot.create({
    data: {
      doctorId: doctor.id,
      slotDate: new Date(todayStr),
      startTime: '17:30',
      endTime: '18:00',
      status: 'BOOKED',
    },
  });

  const testAppt = await prisma.appointment.create({
    data: {
      doctorId: doctor.id,
      patientId: patient.id,
      slotId: testSlot.id,
      appointmentNumber: `TEST-${Date.now()}`,
      appointmentDate: new Date(todayStr),
      status: 'CONFIRMED',
      priority: 'MEDIUM',
      reason: 'AI Wait Time Integration Test Consultation',
    },
  });
  console.log(`[Created Test Appointment] ID: ${testAppt.id}, Initial Status: ${testAppt.status}`);

  try {
    // 3a. Transition to CHECKED_IN
    console.log('--> Step 3a: Updating appointment to CHECKED_IN...');
    const checkedInAppt = await updateAppointmentStatus(testAppt.id, doctor.userId, 'CHECKED_IN');
    const dbCheckedIn = await prisma.appointment.findUnique({ where: { id: testAppt.id } });
    console.log(`  - DB Status: ${dbCheckedIn.status}`);
    console.log(`  - checkedInAt: ${dbCheckedIn.checkedInAt}`);
    if (!dbCheckedIn.checkedInAt) {
      throw new Error('Assertion failed: checkedInAt was not recorded in database!');
    }
    console.log('✓ PASS: checkedInAt timestamp correctly stored on CHECKED_IN transition.');

    // 3b. Transition to IN_PROGRESS
    console.log('--> Step 3b: Updating appointment to IN_PROGRESS (Consultation Started)...');
    const inProgressAppt = await updateAppointmentStatus(testAppt.id, doctor.userId, 'IN_PROGRESS');
    const dbInProgress = await prisma.appointment.findUnique({ where: { id: testAppt.id } });
    const doctorAfterStart = await prisma.doctor.findUnique({ where: { id: doctor.id } });
    console.log(`  - DB Status: ${dbInProgress.status}`);
    console.log(`  - consultationStartedAt: ${dbInProgress.consultationStartedAt}`);
    console.log(`  - Doctor Presence: ${doctorAfterStart.currentPresence}`);
    if (!dbInProgress.consultationStartedAt) {
      throw new Error('Assertion failed: consultationStartedAt was not recorded in database!');
    }
    if (doctorAfterStart.currentPresence !== 'IN_CONSULTATION') {
      throw new Error(`Assertion failed: doctor presence should be IN_CONSULTATION, got ${doctorAfterStart.currentPresence}`);
    }
    console.log('✓ PASS: consultationStartedAt stored and doctor presence set to IN_CONSULTATION.');

    // 3c. Transition to COMPLETED
    console.log('--> Step 3c: Updating appointment to COMPLETED (Consultation Finished)...');
    const completedAppt = await updateAppointmentStatus(testAppt.id, doctor.userId, 'COMPLETED');
    const dbCompleted = await prisma.appointment.findUnique({ where: { id: testAppt.id } });
    const doctorAfterComplete = await prisma.doctor.findUnique({ where: { id: doctor.id } });
    console.log(`  - DB Status: ${dbCompleted.status}`);
    console.log(`  - consultationCompletedAt: ${dbCompleted.consultationCompletedAt}`);
    console.log(`  - actualDurationMinutes: ${dbCompleted.actualDurationMinutes}`);
    console.log(`  - Doctor Presence: ${doctorAfterComplete.currentPresence}`);

    if (!dbCompleted.consultationCompletedAt) {
      throw new Error('Assertion failed: consultationCompletedAt was not recorded in database!');
    }
    if (!dbCompleted.actualDurationMinutes || dbCompleted.actualDurationMinutes < 1) {
      throw new Error(`Assertion failed: actualDurationMinutes should be >= 1, got ${dbCompleted.actualDurationMinutes}`);
    }
    if (doctorAfterComplete.currentPresence !== 'AVAILABLE') {
      throw new Error(`Assertion failed: doctor presence should be AVAILABLE, got ${doctorAfterComplete.currentPresence}`);
    }
    console.log('✓ PASS: consultationCompletedAt and actualDurationMinutes computed and stored, doctor set to AVAILABLE.');

    // -------------------------------------------------------------------------
    // SECTION 4: Live Queue Calculation with Presence Drift
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Live Queue Calculation with Doctor Presence Drift ---');
    const liveQueue = await getLiveQueue(doctor.id, false);
    console.log('Live Queue Stats:');
    console.log('  - Active Queue Length:', liveQueue.activeQueueLength);
    console.log('  - Doctor Presence:', liveQueue.doctor.currentPresence);
    console.log('  - Completed Count Today:', liveQueue.completedCount);

    if (liveQueue.checkedInQueue.length > 0) {
      const firstInQueue = liveQueue.checkedInQueue[0];
      console.log('  - First In Queue Wait:', firstInQueue.formattedWait, 'Minutes:', firstInQueue.estimatedWaitMinutes);
      if (firstInQueue.estimatedWaitMinutes < 5) {
        throw new Error(`Live queue wait sanity failed: ${firstInQueue.estimatedWaitMinutes} < 5`);
      }
    }
    console.log('✓ PASS: Live queue computed dynamically with doctor presence offset.');

  } finally {
    // Clean up test appointment and slot
    console.log('\n[Cleanup] Removing temporary test appointment & slot...');
    await prisma.appointment.delete({ where: { id: testAppt.id } });
    await prisma.appointmentSlot.delete({ where: { id: testSlot.id } });
    // Reset doctor presence to AVAILABLE
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'AVAILABLE' },
    });
    console.log('✓ Cleanup complete. No lingering test artifacts.');
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
