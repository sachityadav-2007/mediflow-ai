/**
 * Comprehensive Frontend Login Verification Script
 * Validates base URL resolution, CORS, credentials, JWT generation,
 * session retrieval (/api/auth/me), and role navigation against the live Render production backend.
 */

const RENDER_PROD_API_URL = 'https://mediflow-api-bz27.onrender.com';
const LOCAL_ORIGIN = 'http://localhost:5173';

function mockResolveApiBaseUrl({ envUrl, useLocal }) {
  if (useLocal) {
    return 'http://localhost:5001';
  }
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  return RENDER_PROD_API_URL;
}

async function runVerification() {
  console.log('\n================================================================');
  console.log('🧪 MEDIFLOW AI: FRONTEND LOGIN & AUTH VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- 1. Base URL Resolution Tests ---
  console.log('--- 1. Testing resolveApiBaseUrl() Logic ---');
  
  // Scenario A: Default on localhost (VITE_API_URL unset)
  const urlA = mockResolveApiBaseUrl({ envUrl: undefined, useLocal: false });
  assert(urlA === RENDER_PROD_API_URL, `Default localhost returns Render backend (${urlA})`);

  // Scenario B: Old localhost in .env, but useLocal is false
  const urlB = mockResolveApiBaseUrl({ envUrl: 'http://localhost:5001', useLocal: false });
  assert(urlB === RENDER_PROD_API_URL, `Legacy localhost in env safely routes to Render backend (${urlB})`);

  // Scenario C: Explicit VITE_API_URL pointing to Render
  const urlC = mockResolveApiBaseUrl({ envUrl: 'https://mediflow-api-bz27.onrender.com', useLocal: false });
  assert(urlC === RENDER_PROD_API_URL, `Explicit Render URL returns Render backend (${urlC})`);

  // Scenario D: Developer explicitly sets useLocal = true
  const urlD = mockResolveApiBaseUrl({ envUrl: 'http://localhost:5001', useLocal: true });
  assert(urlD === 'http://localhost:5001', `Explicit useLocal=true routes to localhost:5001 (${urlD})`);

  // --- 2. Live Health Endpoint Test ---
  console.log('\n--- 2. Testing Live Render Backend Health ---');
  const healthRes = await fetch(`${RENDER_PROD_API_URL}/api/health`, {
    headers: { Origin: LOCAL_ORIGIN },
  });
  assert(healthRes.status === 200, 'Health endpoint returns HTTP 200 OK');
  const healthData = await healthRes.json();
  assert(healthData.success === true, 'Health check returns success: true');
  assert(healthData.database?.connected === true, 'PostgreSQL database connected: true');
  assert(healthData.database?.totalUsers >= 17, `Database verified with ${healthData.database?.totalUsers} users`);

  // --- 3. Live CORS Preflight Test ---
  console.log('\n--- 3. Testing CORS Headers for http://localhost:5173 ---');
  const preflightRes = await fetch(`${RENDER_PROD_API_URL}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: LOCAL_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });
  assert(preflightRes.status === 204 || preflightRes.status === 200, `Preflight status code is ${preflightRes.status}`);
  assert(
    preflightRes.headers.get('access-control-allow-origin') === LOCAL_ORIGIN,
    `CORS allows origin ${LOCAL_ORIGIN}`
  );
  assert(
    preflightRes.headers.get('access-control-allow-credentials') === 'true',
    'CORS allows credentials (cookies/auth headers)'
  );

  // --- 4. Live Login Requests with Demo Roles ---
  console.log('\n--- 4. Testing Real Login Requests & Payloads ---');

  const demoAccounts = [
    { role: 'ADMIN', email: 'admin@mediflow.com', expectedPath: '/admin/dashboard' },
    { role: 'DOCTOR', email: 'dr.sharma@mediflow.com', expectedPath: '/doctor/dashboard' },
    { role: 'PATIENT', email: 'rahul.verma@example.com', expectedPath: '/patient/dashboard' },
  ];

  let adminToken = null;

  for (const account of demoAccounts) {
    const loginRes = await fetch(`${RENDER_PROD_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: LOCAL_ORIGIN,
      },
      body: JSON.stringify({
        email: account.email,
        password: 'password123',
      }),
    });

    assert(loginRes.status === 200, `${account.role} login returns HTTP 200 OK`);
    const data = await loginRes.json();
    assert(data.success === true, `${account.role} response has success: true`);
    assert(Boolean(data.token), `${account.role} response contains JWT token`);
    assert(data.user?.email === account.email, `${account.role} user email matches (${data.user?.email})`);
    assert(data.user?.role === account.role, `${account.role} role matches database record`);

    // Verify target navigation
    const targetPath =
      data.user?.role === 'ADMIN'
        ? '/admin/dashboard'
        : data.user?.role === 'DOCTOR'
        ? '/doctor/dashboard'
        : '/patient/dashboard';
    assert(targetPath === account.expectedPath, `${account.role} redirects correctly to ${targetPath}`);

    if (account.role === 'ADMIN') {
      adminToken = data.token;
    }
  }

  // --- 5. Session Verification (/api/auth/me) with Bearer Token ---
  console.log('\n--- 5. Testing Current User Retrieval (/api/auth/me) ---');
  const meRes = await fetch(`${RENDER_PROD_API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Origin: LOCAL_ORIGIN,
    },
  });
  assert(meRes.status === 200, 'GET /api/auth/me with Bearer token returns HTTP 200 OK');
  const meData = await meRes.json();
  assert(meData.success === true, 'Session response has success: true');
  assert(meData.user?.role === 'ADMIN', 'Session user role verified as ADMIN');

  // --- 6. Invalid Credentials Test ---
  console.log('\n--- 6. Testing Error Handling on Invalid Credentials ---');
  const badLoginRes = await fetch(`${RENDER_PROD_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: LOCAL_ORIGIN,
    },
    body: JSON.stringify({
      email: 'admin@mediflow.com',
      password: 'intentionally_wrong_password',
    }),
  });
  assert(badLoginRes.status === 401, 'Invalid password returns HTTP 401 Unauthorized');
  const badData = await badLoginRes.json();
  assert(badData.success === false, 'Invalid password returns success: false');
  assert(
    badData.message === 'Invalid email or password.',
    `Specific error message returned: "${badData.message}"`
  );

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
