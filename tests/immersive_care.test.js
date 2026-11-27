/**
 * MediFlow Immersive Care Integration & Regression Test Suite
 * Validates AR/VR catalog, 3D model retrieval, telemetry sessions, and learning progress.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const http = require('http');
const jwt = require('../backend/node_modules/jsonwebtoken');
const app = require('../backend/src/app');
const prisma = require('../backend/src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key';

let server;
let testUser;
let authToken;
const TEST_PORT = 5088;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 MEDIFLOW IMMERSIVE CARE: INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Start test server
    await new Promise((resolve) => {
      server = http.createServer(app).listen(TEST_PORT, resolve);
    });
    console.log(`Test server running on ${BASE_URL}\n`);

    // 2. Setup mock/test user in DB or create temporary token
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        testUser = await prisma.user.findFirst();
        if (!testUser) {
          testUser = await prisma.user.create({
            data: {
              name: 'Immersive Test Student',
              email: `immersive_test_${Date.now()}@mediflow.local`,
              password: 'hashed_password_mock',
              role: 'PATIENT',
            },
          });
        }
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        console.log(`Connecting to Neon database (attempt ${attempt}/3)...`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    authToken = jwt.sign(
      { id: testUser.id, role: testUser.role, email: testUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // TEST 1: GET /api/immersive/experiences (Public catalog)
    // -------------------------------------------------------------------------
    const res1 = await fetch(`${BASE_URL}/api/immersive/experiences`);
    const data1 = await res1.json();
    assert(res1.status === 200, 'GET /api/immersive/experiences returns 200 OK');
    assert(data1.success === true, 'Response contains success: true');
    assert(data1.count >= 13, `Contains full catalog of experiences (found ${data1.count})`);

    // -------------------------------------------------------------------------
    // TEST 2: Filter experiences by type
    // -------------------------------------------------------------------------
    const res2 = await fetch(`${BASE_URL}/api/immersive/experiences?type=ORGAN`);
    const data2 = await res2.json();
    assert(res2.status === 200, 'GET /api/immersive/experiences?type=ORGAN returns 200');
    assert(
      data2.data.every((e) => e.type === 'ORGAN'),
      'All returned experiences match type ORGAN'
    );

    // -------------------------------------------------------------------------
    // TEST 3: GET /api/immersive/models (3D Asset repository)
    // -------------------------------------------------------------------------
    const res3 = await fetch(`${BASE_URL}/api/immersive/models`);
    const data3 = await res3.json();
    assert(res3.status === 200, 'GET /api/immersive/models returns 200 OK');
    assert(data3.count >= 8, `Contains 3D anatomical and room models (found ${data3.count})`);

    // -------------------------------------------------------------------------
    // TEST 4: GET /api/immersive/models/:id
    // -------------------------------------------------------------------------
    const res4 = await fetch(`${BASE_URL}/api/immersive/models/model-organ-heart`);
    const data4 = await res4.json();
    assert(res4.status === 200, 'GET /api/immersive/models/model-organ-heart returns 200');
    assert(data4.data.id === 'model-organ-heart', 'Model ID matches requested asset');
    assert(data4.data.category === 'ORGAN', 'Model category is ORGAN');

    // -------------------------------------------------------------------------
    // TEST 5: Missing 3D Model returns 404
    // -------------------------------------------------------------------------
    const res5 = await fetch(`${BASE_URL}/api/immersive/models/non-existent-xyz`);
    const data5 = await res5.json();
    assert(res5.status === 404, 'Missing model returns 404 Not Found');
    assert(data5.success === false, 'Missing model returns success: false');

    // -------------------------------------------------------------------------
    // TEST 6: Unauthorized access to progress is rejected (401)
    // -------------------------------------------------------------------------
    const res6 = await fetch(`${BASE_URL}/api/immersive/progress`);
    assert(res6.status === 401, 'GET /api/immersive/progress without token returns 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 7: Authenticated User can start an immersive telemetry session
    // -------------------------------------------------------------------------
    const res7 = await fetch(`${BASE_URL}/api/immersive/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        experienceId: 'exp-anatomy-3d',
        mode: 'AR',
        deviceType: 'MOBILE_AR',
        metadata: { clientResolution: '1920x1080' },
      }),
    });
    const data7 = await res7.json();
    assert(res7.status === 201, 'POST /api/immersive/sessions returns 201 Created');
    assert(data7.data.mode === 'AR', 'Session recorded AR mode');
    const sessionId = data7.data.id;

    // -------------------------------------------------------------------------
    // TEST 8: Update / Complete immersive telemetry session
    // -------------------------------------------------------------------------
    const res8 = await fetch(`${BASE_URL}/api/immersive/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        duration: 320,
        metadata: { interactions: 15 },
      }),
    });
    const data8 = await res8.json();
    assert(res8.status === 200, 'PATCH /api/immersive/sessions/:id returns 200 OK');
    assert(data8.data.status === 'COMPLETED', 'Session marked as COMPLETED');

    // -------------------------------------------------------------------------
    // TEST 9: Authenticated User saves learning progress
    // -------------------------------------------------------------------------
    const res9 = await fetch(`${BASE_URL}/api/immersive/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        experienceId: 'exp-training-admission',
        completionPercentage: 100,
        completed: true,
        score: 95,
        lastStep: 'Completed Simulation',
      }),
    });
    const data9 = await res9.json();
    assert(res9.status === 200, 'POST /api/immersive/progress returns 200 OK');
    assert(data9.data.completed === true, 'Progress recorded as completed');
    assert(data9.data.score === 95, 'Score recorded as 95');

    // -------------------------------------------------------------------------
    // TEST 10: User progress retrieval returns saved record
    // -------------------------------------------------------------------------
    const res10 = await fetch(`${BASE_URL}/api/immersive/progress`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const data10 = await res10.json();
    assert(res10.status === 200, 'GET /api/immersive/progress returns 200 OK');
    assert(
      data10.data.some((p) => p.experienceId === 'exp-training-admission' && p.completed),
      'Retrieved progress includes completed admission training'
    );

    // -------------------------------------------------------------------------
    // TEST 11: Invalid request body validation (Missing experienceId)
    // -------------------------------------------------------------------------
    const res11 = await fetch(`${BASE_URL}/api/immersive/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        completionPercentage: 50,
      }),
    });
    assert(res11.status === 400, 'POST /api/immersive/progress without experienceId returns 400 Bad Request');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
