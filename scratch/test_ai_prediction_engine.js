/**
 * Phase 10 AI Prediction Engine & Smart Scheduling Test Suite
 * Tests all components:
 * 1. Availability Prediction (Scheduled vs Unscheduled, Presence weights)
 * 2. Demand Forecasting (Department distributions & slot density)
 * 3. Waiting Time Estimation (Queue depth, priority buffers)
 * 4. Smart Slot Recommendation & Scoring Breakdown (Explainable weights)
 * 5. Edge Cases (Insufficient data baseline fallback, invalid dates)
 * 6. Role-Based Access Control (Admin analytics protection, Doctor isolation)
 * 7. Non-Override Safety (Booking conflicts still strictly enforced)
 */

const http = require('http');

const BASE_URL = 'http://localhost:5001';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function extractToken(res) {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return null;
  for (const c of cookies) {
    const match = c.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

async function runAIEngineTests() {
  console.log('=== STARTING PHASE 10 AI PREDICTION ENGINE VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${extraInfo ? `-> ${extraInfo}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Obtain Auth Tokens
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@mediflow.com', password: 'password123' },
    });
    const adminToken = extractToken(adminLogin);
    assert(adminLogin.statusCode === 200 && adminToken, 'Admin authenticates and receives JWT');

    const docLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'dr.sharma@mediflow.com', password: 'password123' },
    });
    const docToken = extractToken(docLogin);
    assert(docLogin.statusCode === 200 && docToken, 'Doctor (Dr. Rajesh Sharma) authenticates and receives JWT');

    const timestamp = Date.now();
    const patientReg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'AI Test Patient',
        email: `patient.ai.${timestamp}@example.com`,
        password: 'Password@123',
        role: 'PATIENT',
        phone: '+91 9988776655',
        dateOfBirth: '1996-06-12',
        gender: 'MALE',
      },
    });
    const patientToken = extractToken(patientReg);
    assert(patientReg.statusCode === 201 && patientToken, 'Patient registers and receives JWT');

    // 2. Fetch Doctor directory
    const docsRes = await request('/api/doctors', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const doctors = docsRes.data.doctors || [];
    const drSharma = doctors.find((d) => d.user?.email === 'dr.sharma@mediflow.com') || doctors[0];
    const drPatel = doctors.find((d) => d.user?.email === 'dr.patel@mediflow.com') || doctors[1];
    console.log(`  Target Doctor A: ${drSharma.user?.name} (ID: ${drSharma.id})`);
    console.log(`  Target Doctor B: ${drPatel.user?.name} (ID: ${drPatel.id})`);

    // Ensure Dr Sharma is PRESENT
    await request('/api/presence/status', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${docToken}` },
      body: { status: 'PRESENT', notes: 'Phase 10 AI Test Suite' },
    });

    // 3. Test Availability Prediction: Positive (scheduled day) vs Negative (unscheduled day)
    console.log('\n  --- Test 1: Doctor Availability Prediction Engine ---');
    // Dr. Sharma is scheduled MONDAY & WEDNESDAY.
    // Let us find next Monday (scheduled) and next Sunday (unscheduled).
    const findNextDay = (targetDayIndex) => {
      const d = new Date();
      for (let i = 1; i <= 14; i++) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() === targetDayIndex) {
          return d.toISOString().split('T')[0];
        }
      }
    };
    const nextMonday = findNextDay(1); // Monday = 1
    const nextSunday = findNextDay(0); // Sunday = 0

    // Scheduled slot test
    const availPositive = await request(
      `/api/ai/doctor-availability?doctorId=${drSharma.id}&date=${nextMonday}&startTime=10:00`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    assert(
      availPositive.statusCode === 200 && availPositive.data?.prediction?.probability > 0.5,
      `Scheduled day (${nextMonday}) predicts high availability probability (${Math.round(
        (availPositive.data?.prediction?.probability || 0) * 100
      )}%)`
    );
    assert(
      availPositive.data?.prediction?.confidence !== undefined,
      'Availability prediction includes confidence assessment'
    );
    assert(
      typeof availPositive.data?.prediction?.explanation === 'string',
      'Availability prediction includes human-readable explanation'
    );

    // Unscheduled day test
    const availNegative = await request(
      `/api/ai/doctor-availability?doctorId=${drSharma.id}&date=${nextSunday}&startTime=10:00`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    assert(
      availNegative.statusCode === 200 && availNegative.data?.prediction?.probability === 0,
      `Unscheduled day (${nextSunday}) predicts 0% availability`
    );
    assert(
      availNegative.data?.prediction?.isScheduled === false,
      'Correctly flags isScheduled = false on doctor days off'
    );

    // 4. Test Appointment Demand Forecasting
    console.log('\n  --- Test 2: Appointment Demand Forecasting ---');
    const demandRes = await request('/api/ai/appointment-demand', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(demandRes.statusCode === 200, 'Appointment demand endpoint responds 200 OK');
    const deptDemand = demandRes.data?.demand?.departmentDemand?.departmentBreakdown || [];
    assert(deptDemand.length > 0, 'Demand breakdown includes hospital medical departments');
    assert(
      demandRes.data?.demand?.slotDemandPatterns?.slotPatterns?.length > 0,
      'Includes hourly slot demand patterns and load ratios'
    );
    assert(
      demandRes.data?.demand?.sevenDayForecast?.dailyForecast?.length === 7,
      'Generates 7-day rolling daily patient visit forecast'
    );

    // 5. Test Waiting Time Estimation
    console.log('\n  --- Test 3: Waiting Time Estimation Engine ---');
    const waitRes = await request(
      `/api/ai/waiting-time?doctorId=${drSharma.id}&date=${nextMonday}&startTime=11:30`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    assert(waitRes.statusCode === 200, 'Waiting time estimation responds 200 OK');
    assert(
      waitRes.data?.waitTime?.estimatedWaitMinutes >= 5,
      `Returns realistic estimated wait minutes (${waitRes.data?.waitTime?.estimatedWaitMinutes} mins)`
    );
    assert(
      waitRes.data?.waitTime?.formattedWaitRange !== undefined,
      'Includes formatted wait range (e.g. 5-15 mins)'
    );
    assert(
      waitRes.data?.waitTime?.queuePosition >= 1,
      'Includes patient queue position'
    );

    // 6. Test Smart Slot Recommendation & Multi-Factor Scoring
    console.log('\n  --- Test 4: Smart Slot Recommendations & Scoring ---');
    const recRes = await request('/api/ai/recommended-slots?limit=5', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(recRes.statusCode === 200, 'Recommended slots endpoint responds 200 OK');
    assert(recRes.data?.recommendations?.length > 0, 'Returns top scored candidate consultation slots');
    const topSlot = recRes.data?.recommendations?.[0];
    assert(
      topSlot && topSlot.aiScore >= 50 && topSlot.aiScore <= 100,
      `Top slot has valid composite AI score (${topSlot?.aiScore}/100)`
    );
    assert(
      topSlot?.scoreBreakdown?.availabilityScore !== undefined &&
        topSlot?.scoreBreakdown?.waitTimeScore !== undefined &&
        topSlot?.scoreBreakdown?.demandScore !== undefined &&
        topSlot?.scoreBreakdown?.clinicalScore !== undefined,
      'Recommendation includes complete 4-component score breakdown'
    );
    assert(
      typeof topSlot?.recommendationReason === 'string',
      'Recommendation includes plain-language explanation'
    );

    // 7. Test Edge Cases & Graceful Degradation
    console.log('\n  --- Test 5: Edge Cases & Input Validation ---');
    // Missing doctorId
    const missingDoc = await request('/api/ai/doctor-availability?date=2026-11-04', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(missingDoc.statusCode === 400, 'Rejects missing doctorId with HTTP 400');

    // Invalid date format
    const badDate = await request(
      `/api/ai/doctor-availability?doctorId=${drSharma.id}&date=invalid-date`,
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    assert(badDate.statusCode === 400, 'Rejects invalid date format with HTTP 400');

    // Unauthenticated request
    const unauth = await request('/api/ai/appointment-demand');
    assert(unauth.statusCode === 401, 'Rejects unauthenticated requests with HTTP 401');

    // 8. Test Role-Based Access Control
    console.log('\n  --- Test 6: Security & Role-Based Access Control ---');
    // Patient attempting to access Admin AI Analytics
    const patientForbidden = await request('/api/ai/admin/analytics', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(
      patientForbidden.statusCode === 403,
      'Rejects non-admin patient from accessing /api/ai/admin/analytics with HTTP 403'
    );

    // Admin accessing Admin AI Analytics
    const adminAllowed = await request('/api/ai/admin/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminAllowed.statusCode === 200 && adminAllowed.data?.analytics?.overview,
      'Admin successfully accesses executive AI analytics with model reliability metrics'
    );

    // Doctor attempting to access another doctor's private forecast
    const doctorIsolation = await request(`/api/ai/forecast/doctor/${drPatel.id}`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    assert(
      doctorIsolation.statusCode === 403,
      "Doctor A is prohibited from viewing Doctor B's private schedule forecast (HTTP 403)"
    );

    // Doctor accessing their own forecast
    const doctorSelf = await request(`/api/ai/forecast/doctor/${drSharma.id}`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    assert(
      doctorSelf.statusCode === 200 && doctorSelf.data?.sevenDayForecast,
      'Doctor can view their own private schedule forecast'
    );

    // 9. Test Non-Override Safety (Booking conflicts still strictly enforced)
    console.log('\n  --- Test 7: Booking Engine Safety & Non-Override ---');
    // Book slotTime 09:00 on nextMonday
    const bookSlot = await request('/api/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        doctorId: drSharma.id,
        date: nextMonday,
        startTime: '09:00',
        priority: 'MEDIUM',
        reason: 'Safety verification booking',
      },
    });

    if (bookSlot.statusCode === 201) {
      // Create another patient trying to book the exact same slot
      const p2Email = `patient.safety.${timestamp}@example.com`;
      const p2Reg = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Patient Safety Duplicate',
          email: p2Email,
          password: 'Password@123',
          role: 'PATIENT',
          phone: '+91 9988771122',
        },
      });
      const p2Token = extractToken(p2Reg);

      const collisionAttempt = await request('/api/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${p2Token}` },
        body: {
          doctorId: drSharma.id,
          date: nextMonday,
          startTime: '09:00',
          priority: 'HIGH',
          reason: 'Collision test',
        },
      });

      assert(
        collisionAttempt.statusCode === 409 || collisionAttempt.statusCode === 400,
        'Booking service strictly rejects double-booking on occupied slot regardless of AI score'
      );
    }

    console.log(`\n========================================`);
    console.log(`AI PREDICTION ENGINE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runAIEngineTests();

