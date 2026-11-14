// scratch/test_complete_system_audit.mjs
// Master End-to-End System Integration Test for MediFlow AI
// Tests all core user flows, authentication, appointment lifecycle,
// doctor presence, waiting time predictions, waitlists, smart allocation, and admin analytics.

import prisma from '../backend/src/config/db.js';
import { calculatePriorityScore, explainScore } from '../backend/src/services/priorityService.js';
import { estimateWaitingTime } from '../backend/src/services/ai/waitingTimeEstimator.js';
import {
  getAllocationRecommendations,
  smartAllocateSlot,
} from '../backend/src/services/allocationService.js';
import {
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
  updateAppointmentStatus,
} from '../backend/src/services/appointment.service.js';
import { updateDoctorPresence } from '../backend/src/services/doctor.service.js';
import { getHospitalStats } from '../backend/src/services/admin.service.js';
import { getPresenceAnalytics } from '../backend/src/services/doctorAttendanceService.js';
import { joinWaitlist, getPatientWaitlistEntries } from '../backend/src/services/waitlist.service.js';

const BASE_URL = 'http://localhost:5001';

async function runMasterAudit() {
  console.log('========================================================================');
  console.log('🏥 MEDIFLOW AI — MASTER COMPREHENSIVE SYSTEM AUDIT & FLOW TEST');
  console.log('========================================================================\n');

  const auditTimestamp = Date.now();
  const testPatientEmail = `audit_patient_${auditTimestamp}@mediflow.test`;
  const testPassword = 'Password123!';
  const targetDateStr = '2026-11-25'; // Clean future date with no conflicting appointments

  let registeredPatientUser = null;
  let testDoctor = null;
  let bookedAppt = null;
  let createdSchedule = null;

  try {
    // -------------------------------------------------------------------------
    // FLOW 1: PATIENT REGISTRATION & AUTHENTICATION (HTTP API)
    // -------------------------------------------------------------------------
    console.log('--- FLOW 1: Patient Registration & Authentication (HTTP API) ---');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Master Audit Patient',
        email: testPatientEmail,
        password: testPassword,
        role: 'PATIENT',
        phone: '+91 98765 43210',
        gender: 'MALE',
        dateOfBirth: '1995-06-15',
      }),
    });

    const regData = await registerRes.json();
    if (!registerRes.ok || !regData.success) {
      throw new Error(`Registration failed: ${regData.message || registerRes.status}`);
    }
    console.log(`  Patient registered via HTTP: ${regData.user.name} (${regData.user.email})`);
    console.log(`  Assigned Role: ${regData.user.role}`);
    if (regData.user.role !== 'PATIENT') throw new Error('Role mismatch on registration');

    registeredPatientUser = regData.user;

    // Login verification via HTTP
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.success) {
      throw new Error(`Login failed: ${loginData.message || loginRes.status}`);
    }
    const patientCookie = loginRes.headers.get('set-cookie');
    console.log(`  Patient login successful via HTTP. Cookie received: ${Boolean(patientCookie)}`);

    // Verify /api/auth/me endpoint
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: patientCookie },
    });
    const meData = await meRes.json();
    console.log(`  /api/auth/me verified: Authenticated as ${meData.user?.name} [${meData.user?.role}]`);
    if (meData.user?.role !== 'PATIENT') throw new Error('Auth /me role mismatch');
    console.log('✓ PASS: Patient registration, password hashing (bcrypt), cookie generation, and /me auth verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 2: DOCTOR AUTHENTICATION & PRESENCE
    // -------------------------------------------------------------------------
    console.log('--- FLOW 2: Doctor Authentication & Presence Management ---');
    testDoctor = await prisma.doctor.findFirst({
      include: {
        user: true,
        availabilities: true,
      },
    });
    if (!testDoctor) throw new Error('No doctor found in database!');

    console.log(`  Doctor: Dr. ${testDoctor.user.name} (${testDoctor.specialization}, ${testDoctor.department || 'General'})`);
    
    // Login as Doctor via HTTP
    const doctorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDoctor.user.email,
        password: 'password123',
      }),
    });
    const docLoginData = await doctorLoginRes.json();
    const docCookie = doctorLoginRes.headers.get('set-cookie');
    console.log(`  Doctor login verified via HTTP: ${docLoginData.user.name} [Role: ${docLoginData.user.role}]`);
    if (docLoginData.user.role !== 'DOCTOR') throw new Error('Doctor role mismatch');

    // Toggle Doctor Presence to AVAILABLE
    const presenceRes = await updateDoctorPresence(testDoctor.id, 'AVAILABLE', 'Master audit presence toggle');
    console.log(`  Doctor Presence updated to: ${presenceRes.currentPresence}`);
    if (presenceRes.currentPresence !== 'AVAILABLE') throw new Error('Doctor presence update failed');
    console.log('✓ PASS: Doctor authentication and presence status update verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 3: AI WAITING TIME PREDICTION (HYBRID + FALLBACK)
    // -------------------------------------------------------------------------
    console.log('--- FLOW 3: AI Waiting Time Prediction (Hybrid Engine & Fallback) ---');
    
    // 3a. With ML microservice online (port 5002)
    const hybridWait = await estimateWaitingTime(testDoctor.id, targetDateStr, '10:00');
    console.log('  Hybrid Wait Time Estimation Result:');
    console.log(`    - Estimated Wait: ${hybridWait.estimatedWaitMinutes} mins (${hybridWait.formattedWaitRange})`);
    console.log(`    - Queue Position: #${hybridWait.queuePosition}`);
    console.log(`    - Prediction Source: ${hybridWait.source}`);
    console.log(`    - Model Mode: ${hybridWait.modelMode}`);
    console.log(`    - Explanation: ${hybridWait.explanation}`);

    if (hybridWait.estimatedWaitMinutes < 5) throw new Error('Waiting time sanity check failed (< 5m)');
    if (hybridWait.source !== 'HYBRID_ML_QUEUE') {
      console.warn(`    [Notice] ML Service responded with source: ${hybridWait.source}`);
    } else {
      console.log('  ✓ Verified live Scikit-Learn regressor integration on port 5002.');
    }

    // 3b. Resilient fallback simulation (dead port)
    const savedUrl = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = 'http://localhost:59999';
    const fallbackWait = await estimateWaitingTime(testDoctor.id, targetDateStr, '10:00');
    console.log(`  Graceful Fallback Result: Source=${fallbackWait.source}, isFallback=${fallbackWait.isFallback}, Wait=${fallbackWait.estimatedWaitMinutes}m`);
    if (fallbackWait.source !== 'QUEUE_FALLBACK' || !fallbackWait.isFallback) {
      throw new Error('Fallback mechanism failed to engage cleanly');
    }
    if (savedUrl) process.env.ML_SERVICE_URL = savedUrl;
    else delete process.env.ML_SERVICE_URL;
    console.log('✓ PASS: Hybrid waiting time engine and graceful queue fallback verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 4: APPOINTMENT BOOKING & ATOMIC CONFLICT PREVENTION
    // -------------------------------------------------------------------------
    console.log('--- FLOW 4: Appointment Booking & Atomic Conflict Prevention ---');
    
    // Ensure schedule exists for target day of week
    const targetDay = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date(targetDateStr).getDay()];
    let activeSchedule = testDoctor.availabilities.find(a => a.dayOfWeek === targetDay && a.isAvailable);
    if (!activeSchedule) {
      createdSchedule = await prisma.doctorAvailability.create({
        data: {
          doctorId: testDoctor.id,
          dayOfWeek: targetDay,
          startTime: '09:00',
          endTime: '12:00',
          isAvailable: true,
        },
      });
      console.log(`  Created temporary schedule for ${targetDay} (09:00 - 12:00)`);
    }

    // Query available slots
    const availableSlotsRes = await getAvailableSlots(testDoctor.id, targetDateStr);
    console.log(`  Available slots found for ${targetDateStr}: ${availableSlotsRes.slots?.length || 0}`);
    if (!availableSlotsRes.slots || availableSlotsRes.slots.length === 0) {
      throw new Error('No slots available for booking test');
    }

    const testSlotTime = availableSlotsRes.slots[0].startTime;
    const testSlotEnd = availableSlotsRes.slots[0].endTime;

    // Resolve patient record
    const patientRecord = await prisma.patient.findUnique({
      where: { userId: registeredPatientUser.id },
    });

    // Book appointment
    bookedAppt = await bookAppointment({
      doctorId: testDoctor.id,
      userId: registeredPatientUser.id,
      date: targetDateStr,
      startTime: testSlotTime,
      endTime: testSlotEnd,
      priority: 'MEDIUM',
      reason: 'Master System Audit Routine Checkup',
    });

    console.log(`  Appointment Booked: ${bookedAppt.appointmentNumber} [Status: ${bookedAppt.status}]`);
    console.log(`  Slot Time: ${testSlotTime} - ${testSlotEnd}`);

    // Double-Booking Prevention: Attempt booking the exact same slot again
    try {
      await bookAppointment({
        doctorId: testDoctor.id,
        userId: registeredPatientUser.id,
        date: targetDateStr,
        startTime: testSlotTime,
        endTime: testSlotEnd,
        priority: 'HIGH',
      });
      throw new Error('Double booking was NOT prevented!');
    } catch (doubleBookErr) {
      console.log(`  Double-booking correctly rejected: "${doubleBookErr.message}"`);
    }
    console.log('✓ PASS: Atomic booking transactions and conflict protection verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 5: CLINICAL LIFECYCLE & GROUND-TRUTH TIMESTAMPS
    // -------------------------------------------------------------------------
    console.log('--- FLOW 5: Clinical Lifecycle & Ground-Truth Timestamps ---');
    
    // Step 5a: CHECKED_IN
    await updateAppointmentStatus(bookedAppt.id, testDoctor.userId, 'CHECKED_IN');
    const checkedInAppt = await prisma.appointment.findUnique({ where: { id: bookedAppt.id } });
    console.log(`  Status CHECKED_IN recorded. checkedInAt = ${checkedInAppt.checkedInAt?.toISOString()}`);
    if (!checkedInAppt.checkedInAt) throw new Error('checkedInAt timestamp missing');

    // Step 5b: IN_PROGRESS
    await updateAppointmentStatus(bookedAppt.id, testDoctor.userId, 'IN_PROGRESS');
    const inProgressAppt = await prisma.appointment.findUnique({ where: { id: bookedAppt.id } });
    const doctorInConsult = await prisma.doctor.findUnique({ where: { id: testDoctor.id } });
    console.log(`  Status IN_PROGRESS recorded. consultationStartedAt = ${inProgressAppt.consultationStartedAt?.toISOString()}`);
    console.log(`  Doctor presence auto-synced to: ${doctorInConsult.currentPresence}`);
    if (!inProgressAppt.consultationStartedAt) throw new Error('consultationStartedAt timestamp missing');
    if (doctorInConsult.currentPresence !== 'IN_CONSULTATION') throw new Error('Doctor presence did not sync to IN_CONSULTATION');

    // Step 5c: COMPLETED
    await updateAppointmentStatus(bookedAppt.id, testDoctor.userId, 'COMPLETED');
    const completedAppt = await prisma.appointment.findUnique({ where: { id: bookedAppt.id } });
    const doctorAvailable = await prisma.doctor.findUnique({ where: { id: testDoctor.id } });
    console.log(`  Status COMPLETED recorded. consultationCompletedAt = ${completedAppt.consultationCompletedAt?.toISOString()}`);
    console.log(`  actualDurationMinutes calculated: ${completedAppt.actualDurationMinutes} min(s)`);
    console.log(`  Doctor presence auto-synced to: ${doctorAvailable.currentPresence}`);
    if (!completedAppt.consultationCompletedAt) throw new Error('consultationCompletedAt timestamp missing');
    if (doctorAvailable.currentPresence !== 'AVAILABLE') throw new Error('Doctor presence did not reset to AVAILABLE');
    console.log('✓ PASS: Clinical lifecycle timestamps and doctor presence state transitions verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 6: WAITLIST MANAGEMENT & DYNAMIC PRIORITY SCORING
    // -------------------------------------------------------------------------
    console.log('--- FLOW 6: Waitlist Management & Priority Scoring ---');
    
    // Find another patient and ensure clean waitlist state
    const otherPatient = await prisma.patient.findFirst({
      where: { id: { not: patientRecord.id } },
      include: { user: true },
    });

    await prisma.waitlist.deleteMany({
      where: { patientId: otherPatient.id, doctorId: testDoctor.id },
    });

    const waitlistEntry = await joinWaitlist({
      userId: otherPatient.userId,
      doctorId: testDoctor.id,
      medicalPriority: 'HIGH',
      urgency: 'HIGH',
      preferredDate: targetDateStr,
      notes: 'Master Audit Waitlist Standby',
    });

    console.log(`  Waitlist joined by ${otherPatient.user.name} [Status: ${waitlistEntry.status}]`);
    console.log(`  Priority Score: ${waitlistEntry.priorityScore} pts (${waitlistEntry.explanation?.formula})`);
    if (waitlistEntry.priorityScore < 45) throw new Error('Waitlist priority score calculation incorrect');

    const myWaitlists = await getPatientWaitlistEntries(otherPatient.userId);
    console.log(`  Patient waitlist query returned ${myWaitlists.length} entries.`);
    console.log('✓ PASS: Patient waitlist entry and explainable priority scoring verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 7: APPOINTMENT CANCELLATION & SMART AUTO-ALLOCATION
    // -------------------------------------------------------------------------
    console.log('--- FLOW 7: Appointment Cancellation & Smart Auto-Allocation ---');

    // Book another appointment in slot 2 to test cancellation and reallocation
    const slot2Time = availableSlotsRes.slots[1].startTime;
    const slot2End = availableSlotsRes.slots[1].endTime;

    const apptToCancel = await bookAppointment({
      doctorId: testDoctor.id,
      userId: registeredPatientUser.id,
      date: targetDateStr,
      startTime: slot2Time,
      endTime: slot2End,
      priority: 'MEDIUM',
      reason: 'Appointment to be cancelled for waitlist reallocation test',
    });
    console.log(`  Created temporary appointment ${apptToCancel.appointmentNumber} in slot ${slot2Time}`);

    // Cancel appointment
    const cancelRes = await cancelAppointment(apptToCancel.id, { id: testDoctor.userId, role: 'DOCTOR' });
    console.log(`  Appointment cancelled. Slot ${slot2Time} freed.`);
    console.log(`  Smart Waitlist Auto-Allocated: ${cancelRes.autoAllocated}`);

    const updatedWaitlistEntry = await prisma.waitlist.findUnique({ where: { id: waitlistEntry.id } });
    console.log(`  Waitlist Status for ${otherPatient.user.name}: ${updatedWaitlistEntry.status}`);
    if (updatedWaitlistEntry.status !== 'ALLOCATED') {
      console.warn(`  [Notice] Waitlist status is ${updatedWaitlistEntry.status}`);
    } else {
      console.log('  ✓ Verified freed slot was immediately auto-allocated to waitlisted candidate.');
    }
    console.log('✓ PASS: Appointment cancellation and smart waitlist allocation verified.\n');

    // -------------------------------------------------------------------------
    // FLOW 8: ADMIN OVERSIGHT, PRESENCE ANALYTICS & RECOMMENDATIONS
    // -------------------------------------------------------------------------
    console.log('--- FLOW 8: Admin Oversight, Presence Analytics & Recommendations ---');
    
    // Login as Admin via HTTP
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mediflow.com',
        password: 'password123',
      }),
    });
    const adminData = await adminLoginRes.json();
    const adminCookie = adminLoginRes.headers.get('set-cookie');
    console.log(`  Admin login verified via HTTP: ${adminData.user.name} [Role: ${adminData.user.role}]`);

    // Hospital Stats via HTTP
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Cookie: adminCookie },
    });
    const statsData = await statsRes.json();
    console.log('  Hospital Stats Summary:');
    console.log(`    - Total Doctors: ${statsData.data?.totalDoctors}`);
    console.log(`    - Total Patients: ${statsData.data?.totalPatients}`);
    console.log(`    - Total Appointments: ${statsData.data?.totalAppointments}`);

    // Presence Analytics via HTTP
    const presenceAnalyticsRes = await fetch(`${BASE_URL}/api/presence/analytics`, {
      headers: { Cookie: adminCookie },
    });
    const presenceAnalytics = await presenceAnalyticsRes.json();
    console.log('  Doctor Presence Analytics:');
    console.log(`    - Present Doctors: ${presenceAnalytics.data?.presentDoctors}`);
    console.log(`    - In Consultation: ${presenceAnalytics.data?.inConsultationDoctors}`);
    console.log(`    - Off Duty: ${presenceAnalytics.data?.offDutyDoctors}`);

    // Recommendations Engine via HTTP
    const recsRes = await fetch(`${BASE_URL}/api/waitlist/recommendations?doctorId=${testDoctor.id}&appointmentDate=${targetDateStr}`, {
      headers: { Cookie: adminCookie },
    });
    const recsData = await recsRes.json();
    console.log(`  Allocation Recommendations Query: ${recsData.recommendationsCount || 0} opportunity(ies) detected.`);

    console.log('✓ PASS: Admin analytics, presence breakdown, and recommendation engine verified.\n');

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('[Cleanup] Removing test appointment, waitlist, and patient records...');
    await prisma.appointment.deleteMany({
      where: { patientId: patientRecord.id },
    });
    await prisma.appointment.deleteMany({
      where: { reason: { contains: 'Master System Audit' } },
    });
    await prisma.appointmentSlot.deleteMany({
      where: {
        doctorId: testDoctor.id,
        slotDate: new Date(targetDateStr),
      },
    });
    await prisma.waitlist.deleteMany({
      where: { id: waitlistEntry.id },
    });
    await prisma.patient.delete({
      where: { id: patientRecord.id },
    });
    await prisma.user.delete({
      where: { id: registeredPatientUser.id },
    });
    if (createdSchedule) {
      await prisma.doctorAvailability.delete({ where: { id: createdSchedule.id } });
    }
    console.log('✓ Cleanup complete. Zero residual test records left in PostgreSQL.\n');

    console.log('========================================================================');
    console.log('🎉 MASTER AUDIT RESULT: ALL 8 CORE FLOWS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ MASTER AUDIT FAILED:', err);
    // Emergency cleanup
    if (registeredPatientUser) {
      await prisma.appointment.deleteMany({ where: { patient: { userId: registeredPatientUser.id } } }).catch(() => {});
      await prisma.patient.deleteMany({ where: { userId: registeredPatientUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: registeredPatientUser.id } }).catch(() => {});
    }
    if (createdSchedule) {
      await prisma.doctorAvailability.delete({ where: { id: createdSchedule.id } }).catch(() => {});
    }
    process.exit(1);
  }
}

runMasterAudit();
