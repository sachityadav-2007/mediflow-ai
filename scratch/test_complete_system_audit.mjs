/**
 * MediFlow AI 2.0 — Complete System Verification & Quality Audit Test Suite
 * Executes end-to-end assertions against live Express, PostgreSQL, and FastAPI services.
 */

import http from 'http';
import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const BACKEND_URL = 'http://localhost:5001';
const ML_URL = 'http://localhost:5002';

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function assert(condition, message) {
  summary.total++;
  if (condition) {
    summary.passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    summary.failed++;
    summary.failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function request(url, options = {}) {
  const { method = 'GET', headers = {}, body = null, cookie = null } = options;
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (cookie) {
    reqHeaders['Cookie'] = cookie;
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : null,
  });

  const resCookie = res.headers.get('set-cookie');
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    cookie: resCookie ? resCookie.split(';')[0] : null,
    data,
  };
}

async function main() {
  console.log('======================================================================');
  console.log('  MediFlow AI 2.0 — Complete System Verification & Quality Audit      ');
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Service Health Checks & Startup Verification
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Service Health Checks & Connectivity ---');
  try {
    const backendHealth = await request(`${BACKEND_URL}/api/health`);
    assert(backendHealth.status === 200, 'Backend /api/health responds with 200 OK');
    assert(backendHealth.data?.success === true, 'Backend health reports success: true');
    assert(backendHealth.data?.database?.connected === true, 'PostgreSQL database connectivity confirmed');
    assert(backendHealth.data?.database?.totalUsers > 0, `Database contains seeded records (${backendHealth.data?.database?.totalUsers} users)`);
  } catch (err) {
    assert(false, `Backend connection failed: ${err.message}`);
  }

  try {
    const mlHealth = await request(`${ML_URL}/health`);
    assert(mlHealth.status === 200, 'FastAPI ML Microservice responds with 200 OK');
    assert(mlHealth.data?.status === 'healthy', 'ML service status reports "healthy"');
    assert(mlHealth.data?.models_loaded?.waiting_time === true, 'Patient waiting time model loaded');
    assert(mlHealth.data?.models_loaded?.doctor_availability === true, 'Doctor availability model loaded');
    assert(mlHealth.data?.models_loaded?.appointment_duration === true, 'Appointment duration model loaded');
    assert(mlHealth.data?.models_loaded?.department_demand === true, 'Department demand model loaded');
  } catch (err) {
    assert(false, `ML Service connection failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Authentication & Token Security
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Authentication & Token Security ---');
  
  // Unauthenticated access
  const unauthMe = await request(`${BACKEND_URL}/api/auth/me`);
  assert(unauthMe.status === 401, 'Unauthenticated /api/auth/me rejected with HTTP 401');
  assert(unauthMe.data?.success === false, 'Rejection payload contains success: false');

  // Invalid login
  const invalidLogin = await request(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    body: { email: 'admin@mediflow.com', password: 'wrongpassword' },
  });
  assert(invalidLogin.status === 401, 'Invalid credentials rejected with HTTP 401');
  assert(invalidLogin.data?.message?.toLowerCase().includes('invalid'), 'Error message is user-friendly and states invalid credentials');

  // Admin Login
  const adminLogin = await request(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    body: { email: 'admin@mediflow.com', password: 'password123' },
  });
  assert(adminLogin.status === 200, 'Admin login succeeds with HTTP 200');
  assert(adminLogin.data?.user?.role === 'ADMIN', 'Admin user role is ADMIN');
  assert(!('password' in adminLogin.data.user), 'Password hash strictly excluded from admin user payload');
  const adminCookie = adminLogin.cookie;
  assert(Boolean(adminCookie && adminCookie.startsWith('token=')), 'HTTP-only auth cookie set on admin login');

  // Doctor Login
  const doctorLogin = await request(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    body: { email: 'dr.sharma@mediflow.com', password: 'password123' },
  });
  assert(doctorLogin.status === 200, 'Doctor login succeeds with HTTP 200');
  assert(doctorLogin.data?.user?.role === 'DOCTOR', 'Doctor user role is DOCTOR');
  const doctorCookie = doctorLogin.cookie;

  // Patient Registration & Login
  const timestamp = Date.now();
  const testPatientEmail = `audit.patient.${timestamp}@example.com`;
  const registerRes = await request(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    body: {
      name: 'System Audit Patient',
      email: testPatientEmail,
      password: 'password123',
      role: 'PATIENT',
      phone: '+91 99999 88888',
      dateOfBirth: '1995-05-15',
      gender: 'MALE',
    },
  });
  assert(registerRes.status === 201 || registerRes.status === 200, 'Patient registration succeeds');
  const patientCookie = registerRes.cookie;

  // Verify /api/auth/me with patient cookie
  const patientMe = await request(`${BACKEND_URL}/api/auth/me`, { cookie: patientCookie });
  assert(patientMe.status === 200, 'Authenticated patient can access /api/auth/me');
  assert(patientMe.data?.user?.email === testPatientEmail, 'Patient email matches registered account');
  assert(patientMe.data?.user?.role === 'PATIENT', 'Patient role verified as PATIENT');
  assert(!('password' in patientMe.data.user), 'Password hash strictly excluded from patient payload');

  // ---------------------------------------------------------------------------
  // SECTION 3: Role-Based Authorization Enforcement (RBAC)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Role-Based Access Control (RBAC) ---');

  // Patient forbidden from Admin endpoints
  const patientAdminAccess = await request(`${BACKEND_URL}/api/admin/stats`, { cookie: patientCookie });
  assert(patientAdminAccess.status === 403, 'Patient blocked from /api/admin/stats with HTTP 403 Forbidden');

  const patientAiAnalytics = await request(`${BACKEND_URL}/api/ai/admin/analytics`, { cookie: patientCookie });
  assert(patientAiAnalytics.status === 403, 'Patient blocked from /api/ai/admin/analytics with HTTP 403 Forbidden');

  const patientEvalAccess = await request(`${BACKEND_URL}/api/ai/admin/evaluation`, { cookie: patientCookie });
  assert(patientEvalAccess.status === 403, 'Patient blocked from /api/ai/admin/evaluation with HTTP 403 Forbidden');

  const patientRetrainAccess = await request(`${BACKEND_URL}/api/ai/admin/retrain`, {
    method: 'POST',
    cookie: patientCookie,
    body: { forceSyntheticBenchmark: true },
  });
  assert(patientRetrainAccess.status === 403, 'Patient blocked from /api/ai/admin/retrain with HTTP 403 Forbidden');

  // Doctor forbidden from Admin endpoints
  const doctorAdminAccess = await request(`${BACKEND_URL}/api/admin/stats`, { cookie: doctorCookie });
  assert(doctorAdminAccess.status === 403, 'Doctor blocked from /api/admin/stats with HTTP 403 Forbidden');

  // Admin allowed to Admin endpoints
  const adminStats = await request(`${BACKEND_URL}/api/admin/stats`, { cookie: adminCookie });
  assert(adminStats.status === 200, 'Admin successfully accesses /api/admin/stats');
  assert('totalDoctors' in (adminStats.data?.data || adminStats.data || {}), 'Admin stats contains totalDoctors metric');

  const adminAiAnalytics = await request(`${BACKEND_URL}/api/ai/admin/analytics`, { cookie: adminCookie });
  assert(adminAiAnalytics.status === 200, 'Admin successfully accesses /api/ai/admin/analytics');

  // ---------------------------------------------------------------------------
  // SECTION 4: Doctor Directory & Filtering
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Doctor Directory & Filtering ---');
  const doctorsRes = await request(`${BACKEND_URL}/api/doctors`);
  assert(doctorsRes.status === 200, 'Public GET /api/doctors responds with 200 OK');
  assert(Array.isArray(doctorsRes.data?.doctors) && doctorsRes.data.doctors.length > 0, `Returned ${doctorsRes.data?.doctors?.length} doctor records`);

  const firstDoctor = doctorsRes.data.doctors[0];
  const doctorDetail = await request(`${BACKEND_URL}/api/doctors/${firstDoctor.id}`);
  assert(doctorDetail.status === 200, `Doctor details query responds 200 OK for ID: ${firstDoctor.id}`);
  assert((doctorDetail.data?.doctor?.user?.name || doctorDetail.data?.doctor?.name) === (firstDoctor.user?.name || firstDoctor.name), 'Doctor name matches directory entry');

  // Search filter
  const searchRes = await request(`${BACKEND_URL}/api/doctors?search=Sharma`);
  assert(searchRes.status === 200, 'Search filter query responds 200 OK');
  assert(searchRes.data?.doctors?.some((d) => (d.user?.name || d.name || '').includes('Sharma')), 'Search result correctly matched Dr. Sharma');

  // Specialty filter
  const specialtyRes = await request(`${BACKEND_URL}/api/doctors?specialization=Cardiologist`);
  assert(specialtyRes.status === 200, 'Specialization filter query responds 200 OK');
  assert(specialtyRes.data?.doctors?.length > 0, 'Found doctors matching Cardiologist specialization');

  // ---------------------------------------------------------------------------
  // SECTION 5: Appointment System & Waitlist Workflow
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Appointment System & Scheduling ---');

  // Target doctor with confirmed schedule and AVAILABLE/PRESENT presence
  // Dr. Ketan Vartak is AVAILABLE and scheduled on WEDNESDAY (09:00 - 17:00)
  const targetDoctor = doctorsRes.data.doctors.find((d) => (d.user?.name || d.name || '').includes('Vartak')) ||
    doctorsRes.data.doctors.find((d) => d.currentPresence !== 'OFFLINE') ||
    firstDoctor;
  const targetDate = '2026-11-25'; // Wednesday

  // Validation: Past date booking rejected
  const pastBooking = await request(`${BACKEND_URL}/api/appointments`, {
    method: 'POST',
    cookie: patientCookie,
    body: {
      doctorId: targetDoctor.id,
      date: '2020-01-01',
      startTime: '10:00',
      reason: 'Past booking validation test',
    },
  });
  assert(pastBooking.status === 400, 'Past appointment date strictly rejected with HTTP 400 Bad Request');
  assert(pastBooking.data?.message?.toLowerCase().includes('past'), 'Error message informs user past dates are disallowed');

  // Available slots for doctor
  const slotsRes = await request(`${BACKEND_URL}/api/appointments/slots/${targetDoctor.id}?date=${targetDate}`, {
    cookie: patientCookie,
  });
  assert(slotsRes.status === 200, `Available slots query responds 200 OK for date: ${targetDate}`);
  assert(Array.isArray(slotsRes.data?.slots), 'Slots returned as an array');

  // AI Slot Recommendations
  const recommendations = await request(`${BACKEND_URL}/api/ai/recommended-slots?specialization=Cardiologist&preferredDate=${targetDate}`, {
    cookie: patientCookie,
  });
  assert(recommendations.status === 200, 'AI slot recommendations endpoint responds 200 OK');
  assert(Array.isArray(recommendations.data?.recommendations), 'Recommendations returned as list');

  // Book a valid appointment on a scheduled doctor slot
  const openSlot = (slotsRes.data?.slots && slotsRes.data.slots.length > 0) ? slotsRes.data.slots[0].startTime : '14:00';
  const bookSlotTime = openSlot;
  const validBooking = await request(`${BACKEND_URL}/api/appointments`, {
    method: 'POST',
    cookie: patientCookie,
    body: {
      doctorId: targetDoctor.id,
      date: targetDate,
      startTime: bookSlotTime,
      reason: 'Quality audit general consultation',
    },
  });
  if (validBooking.status !== 201 && validBooking.status !== 200) {
    console.log('    [DEBUG validBooking]:', validBooking.status, JSON.stringify(validBooking.data));
  }
  assert(validBooking.status === 201 || validBooking.status === 200, 'Valid appointment successfully booked on scheduled doctor slot');
  const appointmentId = validBooking.data?.appointment?.id;

  // Double-booking prevention
  const secondPatientRes = await request(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    body: {
      name: 'Second Audit Patient',
      email: `audit.p2.${timestamp}@example.com`,
      password: 'password123',
      role: 'PATIENT',
      phone: '+91 99999 77777',
    },
  });
  const secondPatientCookie = secondPatientRes.cookie;

  const doubleBooking = await request(`${BACKEND_URL}/api/appointments`, {
    method: 'POST',
    cookie: secondPatientCookie,
    body: {
      doctorId: targetDoctor.id,
      date: targetDate,
      startTime: bookSlotTime,
      reason: 'Attempt double booking collision',
    },
  });
  assert(doubleBooking.status === 409 || doubleBooking.status === 400, 'Double-booking of occupied slot rejected with 409 Conflict / 400');

  // Second patient joins waitlist for that doctor
  const waitlistJoin = await request(`${BACKEND_URL}/api/waitlist`, {
    method: 'POST',
    cookie: secondPatientCookie,
    body: {
      doctorId: targetDoctor.id,
      preferredDate: targetDate,
      medicalPriority: 'HIGH',
      urgency: 'HIGH',
      notes: 'Waitlist audit check',
    },
  });
  assert(waitlistJoin.status === 201 || waitlistJoin.status === 200, 'Patient successfully joined smart waitlist for doctor');
  assert(waitlistJoin.data?.waitlist?.status === 'PENDING', 'Waitlist status recorded as PENDING');

  // Reschedule Appointment to another open slot
  if (appointmentId) {
    const newSlotTime = (slotsRes.data?.slots && slotsRes.data.slots.length > 1) ? slotsRes.data.slots[1].startTime : '15:30';
    const rescheduleRes = await request(`${BACKEND_URL}/api/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      cookie: patientCookie,
      body: {
        newDate: targetDate,
        newStartTime: newSlotTime,
        reason: 'Patient requested time change',
      },
    });
    if (rescheduleRes.status !== 200) {
      console.log('    [DEBUG rescheduleRes]:', rescheduleRes.status, JSON.stringify(rescheduleRes.data));
    }
    assert(rescheduleRes.status === 200, 'Appointment successfully rescheduled to new slot');
  }

  // ---------------------------------------------------------------------------
  // SECTION 6: AI Health Assistant & Smart Symptom Triage
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: AI Health Assistant & Symptom Triage ---');

  // Routine symptoms
  const triageRoutine = await request(`${BACKEND_URL}/api/triage/analyze`, {
    method: 'POST',
    cookie: patientCookie,
    body: { symptoms: 'I have had a mild dry cough and slight runny nose for two days.' },
  });
  assert(triageRoutine.status === 200, 'Triage analysis for routine symptoms responds 200 OK');
  assert(Boolean(triageRoutine.data?.recommendation?.department), `Department recommended: ${triageRoutine.data?.recommendation?.department}`);
  assert(triageRoutine.data?.recommendation?.urgency === 'Routine' || triageRoutine.data?.recommendation?.urgency === 'Soon', `Urgency correctly categorized as ${triageRoutine.data?.recommendation?.urgency}`);
  assert(Boolean(triageRoutine.data?.recommendation?.methodology?.disclaimer), 'Medical safety disclaimer is present in payload');

  // Emergency symptoms
  const triageEmergency = await request(`${BACKEND_URL}/api/triage/analyze`, {
    method: 'POST',
    cookie: patientCookie,
    body: { symptoms: 'Severe sudden crushing chest pain radiating to left arm and severe shortness of breath' },
  });
  assert(triageEmergency.status === 200, 'Triage analysis for critical symptoms responds 200 OK');
  assert(triageEmergency.data?.recommendation?.urgency === 'Emergency', 'Urgency correctly elevated to Emergency');

  // ---------------------------------------------------------------------------
  // SECTION 7: AI Intelligence Dashboard & Controlled Retraining
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 7: AI Intelligence Dashboard & Retraining Controls ---');

  // Data Quality Audit
  const auditRes = await request(`${BACKEND_URL}/api/ai/admin/data-quality`, { cookie: adminCookie });
  assert(auditRes.status === 200, 'GET /api/ai/admin/data-quality responds 200 OK');
  assert(auditRes.data?.audit?.system_status === 'INSUFFICIENT_DATA', 'Data Quality reports honest INSUFFICIENT_DATA status based on real DB');
  assert(auditRes.data?.audit?.can_retrain_production === false, 'can_retrain_production is false when real sample thresholds are not met');
  assert('patient_waiting_time' in (auditRes.data?.audit?.models || {}), 'Model patient_waiting_time audit tracked');
  assert('doctor_availability_and_delay' in (auditRes.data?.audit?.models || {}), 'Model doctor_availability_and_delay audit tracked');

  // Production Retraining blocked on insufficient data
  const blockedRetrain = await request(`${BACKEND_URL}/api/ai/admin/retrain`, {
    method: 'POST',
    cookie: adminCookie,
    body: {
      modelName: 'all',
      forceSyntheticBenchmark: false, // Attempt real production training
    },
  });
  assert(blockedRetrain.status === 400, 'Attempt Production Retraining strictly rejected with HTTP 400 when real data is insufficient');
  assert(blockedRetrain.data?.message?.includes('INSUFFICIENT_DATA'), 'Rejection message clearly states INSUFFICIENT_DATA');

  // Evaluation Metrics Registry
  const evalRes = await request(`${BACKEND_URL}/api/ai/admin/evaluation`, { cookie: adminCookie });
  assert(evalRes.status === 200, 'GET /api/ai/admin/evaluation responds 200 OK');
  const evalModels = evalRes.data?.evaluation?.models || {};
  assert('patient_waiting_time' in evalModels, 'Evaluation contains patient_waiting_time');
  assert(evalModels.patient_waiting_time?.dataset_type === 'SYNTHETIC_DEVELOPMENT_PIPELINE', 'Evaluation dataset type clearly flagged as SYNTHETIC_DEVELOPMENT_PIPELINE');

  // ---------------------------------------------------------------------------
  // SECTION 8: Real-Time Socket.IO Connectivity
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Real-Time Socket.IO Connectivity ---');
  await new Promise((resolve) => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 4000,
    });

    socket.on('connect', () => {
      assert(true, `Socket.IO connected successfully (socket ID: ${socket.id})`);
      socket.emit('join_queue', { doctorId: firstDoctor.id });
      assert(true, `Emitted join_queue for doctor ID: ${firstDoctor.id}`);
      setTimeout(() => {
        socket.disconnect();
        assert(true, 'Socket.IO disconnected cleanly');
        resolve();
      }, 500);
    });

    socket.on('connect_error', (err) => {
      assert(false, `Socket.IO connection failed: ${err.message}`);
      resolve();
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 9: Error Handling & Security Checks
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Security & Error Handling Checks ---');

  // 404 handler check
  const nonExistent = await request(`${BACKEND_URL}/api/does-not-exist-at-all`);
  assert(nonExistent.status === 404, 'Unmapped route returns HTTP 404');
  assert(nonExistent.data?.success === false, 'Unmapped route returns clean JSON with success: false');
  assert(typeof nonExistent.data?.message === 'string' && nonExistent.data.message.includes('Endpoint not found'), 'Clean JSON error message for 404');

  // Invalid JSON payload
  const badInput = await request(`${BACKEND_URL}/api/triage/analyze`, {
    method: 'POST',
    cookie: patientCookie,
    body: { symptoms: 'x' }, // too short
  });
  assert(badInput.status === 400, 'Invalid input rejected with HTTP 400 Bad Request');
  assert(badInput.data?.success === false, 'Error payload contains success: false');
  assert(!JSON.stringify(badInput.data).includes('prisma') && !JSON.stringify(badInput.data).includes('stack'), 'Error message does not leak internal DB details or stack traces');

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`  AUDIT TEST SUMMARY: ${summary.passed} PASSED, ${summary.failed} FAILED (TOTAL: ${summary.total})`);
  console.log('======================================================================\n');

  if (summary.failed > 0) {
    console.error('Failure details:');
    summary.failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
