const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const prisma = require('../backend/src/config/db');
const jwt = require('jsonwebtoken');
const checkInService = require('../backend/src/services/checkInService');
const emailService = require('../backend/src/services/emailService');
const {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
} = require('../backend/src/services/appointment.service');

const JWT_SECRET = process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase11Tests() {
  console.log('\n======================================================');
  console.log('  MediFlow AI — Phase 11 Full Verification Suite');
  console.log('  QR Check-In | Live Queue | Email Notifications');
  console.log('======================================================\n');

  try {
    // Setup test doctor and test patient
    const doctorUser = await prisma.user.findFirst({
      where: { role: 'DOCTOR' },
      include: { doctorProfile: { include: { availabilities: true } } },
    });

    const patientUser = await prisma.user.findFirst({
      where: { role: 'PATIENT' },
      include: { patientProfile: true },
    });

    if (!doctorUser || !patientUser) {
      throw new Error('Seed data missing: please ensure doctor and patient users exist.');
    }

    const doctor = doctorUser.doctorProfile;
    const patient = patientUser.patientProfile;

    // Pick an upcoming working day
    const availableDay = doctor.availabilities.find((a) => a.isAvailable);
    if (!availableDay) {
      throw new Error('No available schedules found on doctor.');
    }

    // Find next matching date for dayOfWeek
    const dayMap = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };
    const targetDayIndex = dayMap[availableDay.dayOfWeek];

    const today = new Date();
    const testDate = new Date();
    for (let i = 1; i <= 7; i++) {
      testDate.setDate(today.getDate() + i);
      if (testDate.getDay() === targetDayIndex) break;
    }
    const testDateStr = testDate.toISOString().split('T')[0];

    // Pick slot time
    const slotStartTime = availableDay.startTime;

    console.log(`[TEST SETUP] Using Doctor: ${doctorUser.name} (${doctor.specialization})`);
    console.log(`[TEST SETUP] Using Patient: ${patientUser.name} on ${testDateStr} at ${slotStartTime}\n`);

    // Ensure test doctor is active
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'AVAILABLE' },
    });

    // Clean up any existing appointments and slots for this doctor & time on testDate
    const existing = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: {
          gte: new Date(`${testDateStr}T00:00:00.000Z`),
          lte: new Date(`${testDateStr}T23:59:59.999Z`),
        },
        slot: { startTime: slotStartTime },
      },
    });
    for (const appt of existing) {
      await prisma.appointment.delete({ where: { id: appt.id } });
    }
    await prisma.appointmentSlot.deleteMany({
      where: {
        doctorId: doctor.id,
        slotDate: {
          gte: new Date(`${testDateStr}T00:00:00.000Z`),
          lte: new Date(`${testDateStr}T23:59:59.999Z`),
        },
        startTime: slotStartTime,
      },
    });

    // -------------------------------------------------------------------------
    // TEST SECTION 1: Booking & Confirmation Email
    // -------------------------------------------------------------------------
    console.log('--- TEST SECTION 1: Appointment Booking & Email Notification ---');
    const appointment = await bookAppointment({
      userId: patientUser.id,
      doctorId: doctor.id,
      date: testDateStr,
      startTime: slotStartTime,
      endTime: null,
      priority: 'HIGH',
      reason: 'Phase 11 QR check-in clinical trial',
    });

    assert(appointment && appointment.id, 'Appointment booked successfully');
    assert(appointment.appointmentNumber.startsWith('APT-'), 'Appointment token generated in standard format');
    assert(appointment.status === 'SCHEDULED', 'Initial appointment status is SCHEDULED');

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Signed QR Code Token Generation & Security
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 2: Signed QR Code Token Generation & Security ---');

    // Attempt unauthorized QR generation (by different user)
    let unauthorizedCaught = false;
    try {
      await checkInService.generateAppointmentQR(appointment.id, {
        id: '00000000-0000-0000-0000-000000000000',
        role: 'PATIENT',
      });
    } catch (e) {
      unauthorizedCaught = true;
    }
    assert(unauthorizedCaught, 'Unauthorized QR access rejected for different patient');

    // Authorized QR generation by owner patient
    const qrData = await checkInService.generateAppointmentQR(appointment.id, {
      id: patientUser.id,
      role: 'PATIENT',
    });

    assert(qrData && qrData.token, 'QR token successfully generated');
    assert(qrData.qrDataUrl.startsWith('data:image/png;base64,'), 'Base64 PNG QR code data URL generated');

    // Verify cryptographic JWT signature
    const decoded = jwt.verify(qrData.token, JWT_SECRET);
    assert(decoded.appointmentId === appointment.id, 'Decoded JWT appointmentId matches database record');
    assert(decoded.type === 'APPOINTMENT_CHECKIN', 'Decoded token carries APPOINTMENT_CHECKIN type claim');

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Check-In Execution & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 3: Reception Check-In Execution & Anti-Duplicate ---');

    // Rejection of invalid token
    let invalidTokenCaught = false;
    try {
      await checkInService.processCheckIn('INVALID-EXPIRED-TOKEN-XYZ', {
        id: 'admin-id',
        role: 'ADMIN',
      });
    } catch (e) {
      invalidTokenCaught = true;
    }
    assert(invalidTokenCaught, 'Invalid QR token correctly rejected by reception check-in');

    // Valid Check-In execution
    const checkInResult = await checkInService.processCheckIn(qrData.token, {
      id: 'admin-id',
      role: 'ADMIN',
    });

    assert(checkInResult.success === true, 'Check-in processed successfully');
    assert(checkInResult.appointment.status === 'CHECKED_IN', 'Appointment status updated to CHECKED_IN in database');
    assert(checkInResult.appointment.checkedInAt !== null, 'checkedInAt timestamp persisted in database');
    assert(typeof checkInResult.queuePosition === 'number', `Live queue position assigned (#${checkInResult.queuePosition})`);

    // Duplicate Check-In attempt rejection
    let duplicateCaught = false;
    try {
      await checkInService.processCheckIn(qrData.token, {
        id: 'admin-id',
        role: 'ADMIN',
      });
    } catch (e) {
      duplicateCaught = true;
      assert(e.message.includes('already checked in'), `Duplicate check-in rejected with notice: "${e.message}"`);
    }
    assert(duplicateCaught, 'Duplicate check-in prevention actively verified');

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Live OPD Patient Queue Display & Privacy
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 4: Live Queue Display & Privacy Masking ---');

    // Public Display mode: patient names MUST be masked
    const publicQueue = await checkInService.getLiveQueue(doctor.id, true);
    assert(publicQueue.success === true, 'Public live queue retrieved');
    assert(publicQueue.isPublic === true, 'Queue identifies as public privacy mode');

    // Verify name masking
    const queueItem = publicQueue.checkedInQueue.find(
      (item) => item.appointmentId === appointment.id
    );
    if (queueItem) {
      assert(queueItem.patientName.includes('***'), `Public queue masked patient name: ${queueItem.patientName}`);
      assert(queueItem.reason === undefined, 'Public queue completely conceals medical reason/diagnosis');
    }

    // Private Staff mode: full patient names visible
    const staffQueue = await checkInService.getLiveQueue(doctor.id, false);
    const staffItem = staffQueue.checkedInQueue.find(
      (item) => item.appointmentId === appointment.id
    );
    if (staffItem) {
      assert(staffItem.patientName === patientUser.name, `Staff queue presents full patient name: ${staffItem.patientName}`);
    }

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Doctor Consultation State Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 5: Doctor Consultation State Lifecycle (START -> COMPLETE) ---');

    // Step 1: Doctor starts consultation
    const startResult = await checkInService.updateConsultationState(
      appointment.id,
      { id: doctorUser.id, role: 'DOCTOR' },
      'START'
    );
    assert(startResult.appointment.status === 'IN_PROGRESS', 'Consultation status transitioned to IN_PROGRESS');

    const doctorAfterStart = await prisma.doctor.findUnique({
      where: { id: doctor.id },
    });
    assert(
      doctorAfterStart.currentPresence === 'IN_CONSULTATION',
      'Doctor live clinic presence automatically updated to IN_CONSULTATION'
    );

    // Step 2: Doctor completes consultation
    const completeResult = await checkInService.updateConsultationState(
      appointment.id,
      { id: doctorUser.id, role: 'DOCTOR' },
      'COMPLETE'
    );
    assert(completeResult.appointment.status === 'COMPLETED', 'Consultation status transitioned to COMPLETED');

    const doctorAfterComplete = await prisma.doctor.findUnique({
      where: { id: doctor.id },
    });
    assert(
      doctorAfterComplete.currentPresence === 'AVAILABLE',
      'Doctor live clinic presence automatically restored to AVAILABLE'
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Email Service Direct Delivery & Previews
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 6: Email Notifications & Preview Verification ---');

    const mailBooking = await emailService.sendBookingConfirmationEmail({
      to: 'patient.test@mediflow.com',
      patientName: 'Rahul Verma',
      appointmentNumber: 'APT-20261103-001',
      doctorName: 'Dr. Ketan Vartak',
      date: '2026-11-04',
      time: '10:00 - 10:30',
      cabin: 'Apollo Wing - Room 302',
    });
    assert(mailBooking && mailBooking.success, 'Booking confirmation email dispatched with MessageId');

    const mailCheckIn = await emailService.sendCheckInEmail({
      to: 'patient.test@mediflow.com',
      patientName: 'Rahul Verma',
      appointmentNumber: 'APT-20261103-001',
      doctorName: 'Dr. Ketan Vartak',
      cabin: 'Apollo Wing - Room 302',
      queuePosition: 2,
    });
    assert(mailCheckIn && mailCheckIn.success, 'Check-in confirmation email dispatched with live queue #');

    const mailReschedule = await emailService.sendRescheduleEmail({
      to: 'patient.test@mediflow.com',
      patientName: 'Rahul Verma',
      appointmentNumber: 'APT-20261103-001',
      doctorName: 'Dr. Ketan Vartak',
      oldDate: '2026-11-04',
      oldTime: '10:00',
      newDate: '2026-11-05',
      newTime: '11:00 - 11:30',
      cabin: 'Apollo Wing - Room 302',
    });
    assert(mailReschedule && mailReschedule.success, 'Reschedule notification email dispatched');

    const mailCancel = await emailService.sendCancellationEmail({
      to: 'patient.test@mediflow.com',
      patientName: 'Rahul Verma',
      appointmentNumber: 'APT-20261103-001',
      doctorName: 'Dr. Ketan Vartak',
      date: '2026-11-04',
      time: '10:00',
    });
    assert(mailCancel && mailCancel.success, 'Cancellation notification email dispatched');

    const mailReminder = await emailService.sendAppointmentReminderEmail({
      to: 'patient.test@mediflow.com',
      patientName: 'Rahul Verma',
      appointmentNumber: 'APT-20261103-001',
      doctorName: 'Dr. Ketan Vartak',
      date: '2026-11-04',
      time: '10:00 - 10:30',
      cabin: 'Apollo Wing - Room 302',
    });
    assert(mailReminder && mailReminder.success, 'Configurable appointment reminder email dispatched');

    // Clean up test appointment & slot
    await prisma.appointment.delete({ where: { id: appointment.id } });
    if (appointment.slotId) {
      await prisma.appointmentSlot.delete({ where: { id: appointment.slotId } }).catch(() => {});
    }

    console.log('\n======================================================');
    console.log(`  PHASE 11 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Phase 11 Test Failure:', err);
    process.exit(1);
  }
}

runPhase11Tests();
