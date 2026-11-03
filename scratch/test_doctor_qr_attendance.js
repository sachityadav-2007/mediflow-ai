const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
} catch (e) {
  require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });
}

const prisma = require('../backend/src/config/db');
let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = require('../backend/node_modules/jsonwebtoken');
}
const doctorAttendanceService = require('../backend/src/services/doctorAttendanceService');

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

async function runDoctorQRAttendanceTests() {
  console.log('\n======================================================');
  console.log('  MediFlow AI — QR Doctor Attendance Verification Suite');
  console.log('  Admin QR Generation | Doctor Scanner | Security Audit');
  console.log('======================================================\n');

  try {
    // 1. Resolve Admin, Doctor, and Patient accounts from Database
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    const doctorUser = await prisma.user.findFirst({
      where: { role: 'DOCTOR' },
      include: { doctorProfile: true },
    });
    const patientUser = await prisma.user.findFirst({
      where: { role: 'PATIENT' },
    });

    if (!adminUser || !doctorUser || !patientUser) {
      throw new Error('Required test users (ADMIN, DOCTOR, PATIENT) not found in database.');
    }

    const doctor = doctorUser.doctorProfile;
    console.log(`[TEST SETUP] Using Admin: ${adminUser.name} (${adminUser.email})`);
    console.log(`[TEST SETUP] Using Doctor: ${doctorUser.name} (${doctor.specialization})`);
    console.log(`[TEST SETUP] Using Patient: ${patientUser.name} (${patientUser.email})\n`);

    // Ensure any open previous attendance sessions for this doctor are closed before test
    await prisma.doctorAttendance.updateMany({
      where: { doctorId: doctor.id, status: 'CHECKED_IN' },
      data: { status: 'CHECKED_OUT', checkOutTime: new Date() },
    });
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'OFFLINE' },
    });

    // -------------------------------------------------------------------------
    // TEST SECTION 1: Admin QR Code Generation & Validation
    // -------------------------------------------------------------------------
    console.log('--- TEST SECTION 1: Admin Hospital QR Generation & Verification ---');
    const qrResult = await doctorAttendanceService.generateHospitalQR({
      location: 'MediFlow West Wing - Suite 302',
      validityMinutes: 60,
      adminUser,
    });

    assert(qrResult && qrResult.qrCode, 'Admin successfully generated hospital QR code');
    assert(qrResult.qrCode.code.startsWith('HOSP-QR-'), 'QR code has unique cryptographic identifier');
    assert(qrResult.qrDataUrl.startsWith('data:image/png;base64,'), 'Base64 PNG QR code generated for desk display');
    assert(qrResult.validityMinutes === 60, 'Validity window matches configured 60 minutes');

    // Decode signed JWT
    const decodedToken = jwt.verify(qrResult.signedToken, JWT_SECRET);
    assert(decodedToken.code === qrResult.qrCode.code, 'Decoded JWT code matches database record');
    assert(decodedToken.type === 'HOSPITAL_DOCTOR_ATTENDANCE', 'Token payload enforces HOSPITAL_DOCTOR_ATTENDANCE type');
    assert(decodedToken.location === 'MediFlow West Wing - Suite 302', 'Token location matches hospital suite');

    // Verify Active QR list contains generated QR
    const activeQRs = await doctorAttendanceService.getActiveHospitalQRCodes();
    const foundQR = activeQRs.find((q) => q.code === qrResult.qrCode.code);
    assert(foundQR !== undefined, 'Active hospital QR codes listing returns newly generated code');

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Security & Role-Based Access Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 2: Security & Role-Based Authorization Enforcement ---');

    // Test 2A: Patient attempts to scan doctor hospital QR
    let patientScanRejected = false;
    try {
      await doctorAttendanceService.processDoctorCheckIn({
        token: qrResult.signedToken,
        doctorUser: patientUser,
        ipAddress: '192.168.1.101',
        userAgent: 'Mobile Patient App',
      });
    } catch (err) {
      patientScanRejected = true;
      assert(err.message.includes('Unauthorized'), `Patient scan correctly rejected: "${err.message}"`);
    }
    assert(patientScanRejected, 'Unauthorized patient scan blocked with 403 error');

    // Verify unauthorized audit log entry exists
    const recentAudits = await prisma.qRScanAudit.findMany({
      where: { userId: patientUser.id },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });
    assert(recentAudits.length > 0 && recentAudits[0].status === 'FAILED', 'Unauthorized attempt stamped in security audit trail');

    // Test 2B: Malformed / Tampered Token
    let invalidTokenRejected = false;
    try {
      await doctorAttendanceService.processDoctorCheckIn({
        token: 'FORGED.FAKE.TOKEN',
        doctorUser,
        ipAddress: '127.0.0.1',
      });
    } catch (err) {
      invalidTokenRejected = true;
      assert(err.message.includes('Invalid QR code signature'), `Tampered token rejected: "${err.message}"`);
    }
    assert(invalidTokenRejected, 'Cryptographic signature tampering strictly detected and rejected');

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Token Expiration & Revocation Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 3: Token Expiration & Admin Revocation Enforcement ---');

    // Test 3A: Expired token
    const expiredToken = jwt.sign(
      {
        code: 'HOSP-EXPIRED-TEST',
        location: 'OPD Expired',
        type: 'HOSPITAL_DOCTOR_ATTENDANCE',
      },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );

    let expiredRejected = false;
    try {
      await doctorAttendanceService.processDoctorCheckIn({
        token: expiredToken,
        doctorUser,
      });
    } catch (err) {
      expiredRejected = true;
      assert(err.message.includes('expired'), `Expired token rejected with notice: "${err.message}"`);
    }
    assert(expiredRejected, 'Expired QR code rejected cleanly');

    // Test 3B: Admin Revocation
    const revokableQR = await doctorAttendanceService.generateHospitalQR({
      location: 'Emergency Bay - Test Revoke',
      validityMinutes: 30,
      adminUser,
    });

    const revokeResult = await doctorAttendanceService.revokeHospitalQR({
      codeId: revokableQR.qrCode.id,
      adminUser,
    });
    assert(revokeResult.success === true, 'Admin successfully revoked active QR code');

    let revokedScanRejected = false;
    try {
      await doctorAttendanceService.processDoctorCheckIn({
        token: revokableQR.signedToken,
        doctorUser,
      });
    } catch (err) {
      revokedScanRejected = true;
      assert(err.message.includes('revoked'), `Revoked token rejected: "${err.message}"`);
    }
    assert(revokedScanRejected, 'Revoked QR code blocked from subsequent check-ins');

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Doctor Check-In Execution & Presence Transition
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 4: Valid Doctor Check-In & Real-Time Presence State ---');

    const checkInResponse = await doctorAttendanceService.processDoctorCheckIn({
      token: qrResult.signedToken,
      doctorUser,
      ipAddress: '10.0.0.50',
      userAgent: 'Hospital Clinic iPad',
    });

    assert(checkInResponse.success === true, 'Doctor check-in processed successfully');
    assert(checkInResponse.attendance.status === 'CHECKED_IN', 'Doctor attendance session created with status CHECKED_IN');
    assert(checkInResponse.attendance.location === 'MediFlow West Wing - Suite 302', 'Attendance location matches QR code location');
    assert(checkInResponse.attendance.checkInMethod === 'QR_SCAN', 'Check-in method verified as QR_SCAN');

    // Verify Doctor live presence updated in database to PRESENT
    const doctorInDb = await prisma.doctor.findUnique({
      where: { id: doctor.id },
    });
    assert(doctorInDb.currentPresence === 'PRESENT', 'Doctor currentPresence updated to PRESENT in database');

    // Verify PresenceLog audit entry created
    const presenceLog = await prisma.presenceLog.findFirst({
      where: { doctorId: doctor.id },
      orderBy: { timestamp: 'desc' },
    });
    assert(presenceLog.status === 'PRESENT', 'PresenceLog recorded with status PRESENT');
    assert(presenceLog.detectionMethod === 'QR_SCAN', 'PresenceLog detectionMethod recorded as QR_SCAN');

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Duplicate Check-In & Anti-Replay Protection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 5: Duplicate Check-In & Anti-Replay Protection ---');

    let duplicateRejected = false;
    try {
      await doctorAttendanceService.processDoctorCheckIn({
        token: qrResult.signedToken,
        doctorUser,
      });
    } catch (err) {
      duplicateRejected = true;
      assert(err.message.includes('already checked in'), `Duplicate check-in blocked: "${err.message}"`);
    }
    assert(duplicateRejected, 'Anti-replay prevents doctor from double checking-in on same session');

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Doctor Check-Out & Duration Computation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 6: Doctor Check-Out & Working Duration Computation ---');

    const checkOutResponse = await doctorAttendanceService.processDoctorCheckOut({
      doctorUser,
      notes: 'Evening rounds completed and shift handed over to night duty doctor.',
      ipAddress: '10.0.0.50',
    });

    assert(checkOutResponse.success === true, 'Doctor check-out processed successfully');
    assert(checkOutResponse.attendance.status === 'CHECKED_OUT', 'Attendance session status updated to CHECKED_OUT');
    assert(checkOutResponse.attendance.checkOutTime !== null, 'checkOutTime timestamp recorded');
    assert(typeof checkOutResponse.durationMinutes === 'number', `Working duration computed: ${checkOutResponse.durationMinutes} min(s)`);

    // Verify Doctor live presence transitioned to OFFLINE
    const doctorAfterCheckout = await prisma.doctor.findUnique({
      where: { id: doctor.id },
    });
    assert(doctorAfterCheckout.currentPresence === 'OFFLINE', 'Doctor currentPresence transitioned to OFFLINE');

    // Test duplicate check-out rejection
    let duplicateCheckoutRejected = false;
    try {
      await doctorAttendanceService.processDoctorCheckOut({
        doctorUser,
      });
    } catch (err) {
      duplicateCheckoutRejected = true;
      assert(err.message.includes('does not have an active check-in session'), `Duplicate checkout rejected: "${err.message}"`);
    }
    assert(duplicateCheckoutRejected, 'Duplicate checkout prevented when doctor is not checked in');

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Doctor Self-Service & Admin History Queries
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 7: Doctor Portal Status & Admin Attendance Logs ---');

    const myAttendance = await doctorAttendanceService.getDoctorMyAttendance(doctorUser);
    assert(myAttendance.success === true, 'Doctor successfully fetched personal attendance summary');
    assert(myAttendance.isCheckedIn === false, 'Doctor status correctly reflects checked-out state');
    assert(myAttendance.todaySessions.length >= 1, 'Doctor todaySessions contains completed shift');

    const adminHistory = await doctorAttendanceService.getAttendanceHistory({
      user: adminUser,
      doctorId: doctor.id,
    });
    assert(adminHistory.success === true, 'Admin successfully retrieved doctor attendance history');
    assert(adminHistory.records.length >= 1, 'Admin records contain doctor attendance logs');
    assert(adminHistory.records[0].checkInMethod === 'QR_SCAN', 'Admin record confirms QR_SCAN verification');

    // Clean up test QR code and attendance records created during test
    await prisma.doctorAttendance.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.hospitalQRCode.deleteMany({ where: { code: qrResult.qrCode.code } });
    await prisma.hospitalQRCode.deleteMany({ where: { code: revokableQR.qrCode.code } });

    console.log('\n======================================================');
    console.log(`  DOCTOR QR ATTENDANCE TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Doctor QR Attendance Test Failure:', err);
    process.exit(1);
  }
}

runDoctorQRAttendanceTests();

