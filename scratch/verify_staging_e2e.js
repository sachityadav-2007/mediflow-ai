const http = require('http');

const API_BASE = 'http://localhost:5001/api';

// Helper for HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const latencyMs = Date.now() - startTime;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
          latencyMs,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runStagingVerification() {
  console.log('===========================================================');
  console.log('  MediFlow AI — Live Staging Environment Verification Suite');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${message} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message} ${details ? `[${details}]` : ''}`);
      failed++;
    }
  }

  // 1. Health & Database Connectivity
  console.log('--- 1. Health & Database Check ---');
  const healthRes = await request('GET', '/health');
  assert(healthRes.status === 200, 'Health check responds 200 OK', `${healthRes.latencyMs}ms`);
  assert(healthRes.data?.success === true, 'Health payload success is true');
  assert(healthRes.data?.database?.connected === true, 'PostgreSQL database connection verified');

  // 2. Doctor Directory & Public Search
  console.log('\n--- 2. Public Doctor Directory & Search ---');
  const doctorsRes = await request('GET', '/doctors');
  assert(doctorsRes.status === 200, 'Get all doctors responds 200 OK', `${doctorsRes.latencyMs}ms`);
  assert(Array.isArray(doctorsRes.data?.doctors), 'Doctors roster is an array');
  assert(doctorsRes.data?.doctors?.length > 0, `Returned ${doctorsRes.data?.doctors?.length} registered doctors`);

  const firstDoctor = doctorsRes.data?.doctors[0];
  const doctorId = firstDoctor?.id;
  assert(Boolean(doctorId), `Selected target doctor: ${firstDoctor?.user?.name} (${firstDoctor?.specialization})`);

  // Search by query
  const searchRes = await request('GET', `/doctors?search=${encodeURIComponent(firstDoctor?.user?.name.split(' ')[1] || 'Doctor')}`);
  assert(searchRes.status === 200, 'Doctor search query responds 200 OK');
  assert(searchRes.data?.doctors?.length >= 1, 'Search query returned matching specialist');

  // 3. Authentication & RBAC Verification
  console.log('\n--- 3. Authentication & Role-Based Access Control ---');
  // Admin Login
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@mediflow.com',
    password: 'password123',
  });
  assert(adminLogin.status === 200, 'Admin login responds 200 OK', `${adminLogin.latencyMs}ms`);
  assert(adminLogin.data?.user?.role === 'ADMIN', 'Admin role asserted');
  const adminCookie = adminLogin.headers['set-cookie']?.[0]?.split(';')[0];
  assert(Boolean(adminCookie), 'Admin received session cookie');

  // Doctor Login
  const doctorLogin = await request('POST', '/auth/login', {
    email: 'dr.sharma@mediflow.com',
    password: 'password123',
  });
  assert(doctorLogin.status === 200, 'Doctor login responds 200 OK', `${doctorLogin.latencyMs}ms`);
  assert(doctorLogin.data?.user?.role === 'DOCTOR', 'Doctor role asserted');
  const doctorCookie = doctorLogin.headers['set-cookie']?.[0]?.split(';')[0];

  // Patient Registration
  const testEmail = `staging.patient.${Date.now()}@mediflow.com`;
  const patientReg = await request('POST', '/auth/register', {
    name: 'Staging Test Patient',
    email: testEmail,
    password: 'password123',
    role: 'PATIENT',
    phone: '9876543210',
  });
  assert(patientReg.status === 201, 'New patient registration responds 201 Created', `${patientReg.latencyMs}ms`);
  const patientCookie = patientReg.headers['set-cookie']?.[0]?.split(';')[0];

  // Unauthorized Admin endpoint test by Patient
  const unauthorizedAdmin = await request('GET', '/admin/stats', null, { Cookie: patientCookie });
  assert(unauthorizedAdmin.status === 403, 'Patient blocked from /api/admin/stats with 403 Forbidden');

  // Admin access to stats
  const adminStats = await request('GET', '/admin/stats', null, { Cookie: adminCookie });
  assert(adminStats.status === 200, 'Admin accesses /api/admin/stats with 200 OK');
  assert(typeof adminStats.data?.data?.totalDoctors === 'number', `Live doctors in hospital: ${adminStats.data?.data?.totalDoctors}`);

  // 4. AI Prediction Engine Verification
  console.log('\n--- 4. AI Prediction Engine & Availability Forecasting ---');
  const aiAvail = await request(
    'GET',
    `/ai/doctor-availability?doctorId=${doctorId}&date=2026-11-09&startTime=10:00`,
    null,
    { Cookie: patientCookie }
  );
  assert(aiAvail.status === 200, 'AI doctor availability prediction responds 200 OK', `${aiAvail.latencyMs}ms`);
  assert(typeof aiAvail.data?.prediction?.probability === 'number', `Computed probability: ${Math.round(aiAvail.data?.prediction?.probability * 100)}%`);
  assert(Boolean(aiAvail.data?.prediction?.explanation), 'AI provided human-readable explanation');

  const aiWait = await request(
    'GET',
    `/ai/waiting-time?doctorId=${doctorId}&date=2026-11-09&startTime=10:00`,
    null,
    { Cookie: patientCookie }
  );
  assert(aiWait.status === 200, 'AI waiting-time estimation responds 200 OK', `${aiWait.latencyMs}ms`);
  assert(typeof aiWait.data?.waitTime?.estimatedWaitMinutes === 'number', `Estimated wait: ${aiWait.data?.waitTime?.estimatedWaitMinutes} mins`);

  // 5. QR Doctor Attendance & Hospital Gate Verification
  console.log('\n--- 5. QR Doctor Attendance Security & Lifecycle ---');
  // First ensure doctor is checked out from any previous test
  await request('POST', '/presence/qr/check-out', { notes: 'Reset before test' }, { Cookie: doctorCookie });

  // Admin generates hospital QR code
  const qrGen = await request(
    'POST',
    '/presence/qr/generate',
    { location: 'Staging OPD Suite - Room 101', validityMinutes: 30 },
    { Cookie: adminCookie }
  );
  assert(qrGen.status === 201, 'Admin generates hospital QR code responds 201 Created', `${qrGen.latencyMs}ms`);
  const qrToken = qrGen.data?.signedToken;
  const qrCodeId = qrGen.data?.qrCode?.id;
  assert(Boolean(qrToken), 'Cryptographic signed JWT token minted');

  // Patient scan attempt (must be rejected)
  const patientScan = await request(
    'POST',
    '/presence/qr/check-in',
    { token: qrToken },
    { Cookie: patientCookie }
  );
  assert(patientScan.status === 403, 'Unauthorized patient scan rejected with 403 Forbidden');

  // Doctor check-in
  const doctorCheckIn = await request(
    'POST',
    '/presence/qr/check-in',
    { token: qrToken },
    { Cookie: doctorCookie }
  );
  assert(doctorCheckIn.status === 200, 'Doctor scan check-in responds 200 OK', `${doctorCheckIn.latencyMs}ms`);
  assert(doctorCheckIn.data?.attendance?.status === 'CHECKED_IN', 'Doctor attendance session is CHECKED_IN');

  // Replay check-in (must be rejected)
  const replayScan = await request(
    'POST',
    '/presence/qr/check-in',
    { token: qrToken },
    { Cookie: doctorCookie }
  );
  assert(replayScan.status === 409 || replayScan.status === 400, 'Replay scan blocked (anti-duplicate check-in active)');

  // Doctor check-out
  const doctorCheckOut = await request(
    'POST',
    '/presence/qr/check-out',
    { notes: 'Staging shift complete' },
    { Cookie: doctorCookie }
  );
  assert(doctorCheckOut.status === 200, 'Doctor checkout responds 200 OK', `${doctorCheckOut.latencyMs}ms`);
  assert(doctorCheckOut.data?.attendance?.status === 'CHECKED_OUT', 'Doctor attendance session marked CHECKED_OUT');

  // Admin revokes QR code
  const qrRevoke = await request(
    'POST',
    '/presence/qr/revoke',
    { codeId: qrCodeId },
    { Cookie: adminCookie }
  );
  assert(qrRevoke.status === 200, 'Admin revokes QR code responds 200 OK');

  // 6. Live OPD Queue Verification
  console.log('\n--- 6. Live OPD Queue & Privacy Masking ---');
  const queueRes = await request('GET', `/check-in/queue/${doctorId}?public=true`);
  assert(queueRes.status === 200, 'Live OPD queue responds 200 OK', `${queueRes.latencyMs}ms`);
  assert(queueRes.data?.isPublic === true, 'Queue enforces isPublic privacy masking');

  // 7. Security Header & CORS Check
  console.log('\n--- 7. Security Headers & CORS ---');
  const corsPreflight = await request('OPTIONS', '/health', null, {
    Origin: 'http://localhost:5173',
    'Access-Control-Request-Method': 'GET',
  });
  assert(corsPreflight.status === 200 || corsPreflight.status === 204, 'CORS preflight allowed for valid origin');

  console.log('\n===========================================================');
  console.log(`  STAGING VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStagingVerification().catch((err) => {
  console.error('Unhandled error during staging verification:', err);
  process.exit(1);
});
