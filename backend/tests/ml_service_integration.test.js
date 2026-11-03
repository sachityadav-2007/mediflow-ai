/**
 * MediFlow AI 2.0 — Express ML Service Integration Test Suite
 * Validates Express client integration with FastAPI ML service, RBAC security,
 * advisory responses, and fallback handling.
 */

const http = require('http');

const BASE_URL = 'http://localhost:5001';

function makeRequest(path, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let body = null;
          try {
            body = JSON.parse(raw);
          } catch (_) {
            body = raw;
          }
          resolve({ statusCode: res.statusCode, body, headers: res.headers });
        });
      }
    );
    req.on('error', (err) => resolve({ statusCode: 500, error: err.message }));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runTests() {
  console.log('======================================================');
  console.log('  MediFlow AI 2.0 — ML Service Integration Tests     ');
  console.log('======================================================\n');

  // 1. Authenticate Admin
  console.log('--- SECTION 1: Authentication & RBAC Tokens ---');
  const adminLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@mediflow.com', password: 'password123' },
  });
  assert(adminLogin.statusCode === 200, 'Admin authenticates successfully');
  const rawCookie = adminLogin.headers['set-cookie'];
  const cookieStr = Array.isArray(rawCookie) ? rawCookie.join(';') : rawCookie;
  const match = cookieStr.match(/token=([^;]+)/);
  const adminToken = match ? match[1] : null;
  assert(adminToken !== null, 'Admin JWT acquired from auth cookie');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Register / Login Patient for RBAC test
  const patientEmail = `mltest.patient.${Date.now()}@example.com`;
  const patReg = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'ML Test Patient',
      email: patientEmail,
      password: 'password123',
      role: 'PATIENT',
      phone: '+91 99999 88888',
    },
  });
  assert(patReg.statusCode === 201 || patReg.statusCode === 200, 'Test patient registered');
  const patLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: patientEmail, password: 'password123' },
  });
  const patCookie = patLogin.headers['set-cookie'];
  const patCookieStr = Array.isArray(patCookie) ? patCookie.join(';') : patCookie;
  const patMatch = patCookieStr.match(/token=([^;]+)/);
  const patientToken = patMatch ? patMatch[1] : null;
  const patientHeaders = { Authorization: `Bearer ${patientToken}` };

  // 2. Test Model Status
  console.log('\n--- SECTION 2: Model Status Endpoint ---');
  const statusRes = await makeRequest('/api/ai/model-status', { headers: adminHeaders });
  assert(statusRes.statusCode === 200, 'GET /api/ai/model-status returns HTTP 200');
  assert(statusRes.body?.success === true, 'Response payload has success=true');
  assert(statusRes.body?.status?.service === 'MediFlow AI ML Service', 'Connects to MediFlow AI ML Service');
  assert(statusRes.body?.status?.models_loaded?.waiting_time === true, 'Waiting time model reported loaded');
  assert(statusRes.body?.status?.models_loaded?.doctor_availability === true, 'Doctor availability model reported loaded');

  // 3. Test Admin Evaluation Endpoint & RBAC Guard
  console.log('\n--- SECTION 3: Admin Model Evaluation Registry & RBAC ---');
  const evalRes = await makeRequest('/api/ai/admin/evaluation', { headers: adminHeaders });
  assert(evalRes.statusCode === 200, 'Admin successfully accesses /api/ai/admin/evaluation');
  assert(evalRes.body?.evaluation?.models !== undefined, 'Contains models evaluation dictionary');
  assert(evalRes.body?.evaluation?.models?.patient_waiting_time !== undefined, 'Contains patient_waiting_time entry');

  // RBAC check: Patient blocked
  const patBlocked = await makeRequest('/api/ai/admin/evaluation', { headers: patientHeaders });
  assert(patBlocked.statusCode === 403, 'Non-admin patient blocked from /api/ai/admin/evaluation with HTTP 403 Forbidden');

  // 4. Test Appointment Duration Prediction
  console.log('\n--- SECTION 4: Appointment Duration Prediction ---');
  const durRes = await makeRequest('/api/ai/appointment-duration?department=Cardiology&priorityLevel=HIGH', {
    headers: adminHeaders,
  });
  assert(durRes.statusCode === 200, 'GET /api/ai/appointment-duration returns HTTP 200');
  assert(durRes.body?.success === true, 'Duration response has success=true');
  assert(typeof durRes.body?.duration?.predicted_duration_minutes === 'number', 'Predicted duration is a valid number');
  assert(durRes.body?.duration?.source === 'ml-service', 'Source confirmed as ml-service');

  // 5. Test Waiting Time with Advisory ML metadata
  console.log('\n--- SECTION 5: Waiting Time Advisory Integration ---');
  const docRes = await makeRequest('/api/doctors');
  const doctorId = docRes.body?.data?.[0]?.id || '81adfc93-2cdb-4f69-a04c-baf464127475';
  const waitRes = await makeRequest(`/api/ai/waiting-time?doctorId=${doctorId}&date=2026-11-09&startTime=10:00`, {
    headers: adminHeaders,
  });
  assert(waitRes.statusCode === 200, 'GET /api/ai/waiting-time returns HTTP 200');
  assert(waitRes.body?.waitTime !== undefined, 'Wait time estimation payload present');
  assert(waitRes.body?.waitTime?.mlAdvisory !== undefined, 'Includes advisory ML inference metadata');
  assert(waitRes.body?.waitTime?.mlAdvisory?.source === 'ml-service', 'Advisory source verified as ml-service');

  // 6. Test Doctor Availability with Advisory ML metadata
  console.log('\n--- SECTION 6: Doctor Availability Advisory Integration ---');
  const availRes = await makeRequest(`/api/ai/doctor-availability?doctorId=${doctorId}&date=2026-11-09&startTime=10:00`, {
    headers: adminHeaders,
  });
  assert(availRes.statusCode === 200, 'GET /api/ai/doctor-availability returns HTTP 200');
  assert(availRes.body?.prediction !== undefined, 'Availability payload present');
  assert(availRes.body?.prediction?.mlAdvisory !== undefined, 'Includes advisory ML inference metadata');
  assert(typeof availRes.body?.prediction?.mlAdvisory?.availability_probability === 'number', 'Availability probability is a valid float');

  console.log('\n======================================================');
  console.log('  ALL ML SERVICE INTEGRATION TESTS PASSED (100%)       ');
  console.log('======================================================');
}

runTests();

