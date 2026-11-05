// scratch/test_ai_health_navigator.mjs
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 MediFlow AI — AI Health Navigation Assistant Comprehensive Verification');
  console.log('========================================================================');
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

  const baseUrl = 'http://localhost:5001';

  // ---------------------------------------------------------------------------
  // STEP 0: Authenticate Patient to obtain session token
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 0: Authenticating Patient Session ---');
  let patientCookie = '';
  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.com', password: 'password123' }),
    });
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      patientCookie = setCookie.split(';')[0];
    }
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.success, `Patient authenticated successfully (${loginData.user.name}, role: ${loginData.user.role})`);
  } catch (err) {
    assert(false, `Authentication failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Normal Symptom Input (Neurology, Orthopedics, Cardiology, Urology)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 1: Normal Symptom Inputs & Specialty Routing ---');
  // 1a. Neurology
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I have a persistent headache and dizziness for two days.' }),
    });
    const data = await res.json();
    assert(
      res.ok && data.success && data.recommendation.recommendedSpecialty === 'Neurology',
      `Neurology recommendation verified (Specialty: ${data.recommendation?.recommendedSpecialty}, Confidence: ${data.recommendation?.confidence})`
    );
    assert(
      data.matchingDoctors.some((d) => d.specialization.includes('Neuro')),
      `Matching neurologists returned from real DB (found ${data.matchingDoctors.length} doctors, e.g. ${data.matchingDoctors[0]?.name})`
    );
  } catch (err) {
    assert(false, `Neurology test error: ${err.message}`);
  }

  // 1b. Orthopedics
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I have severe knee pain and joint stiffness after walking.' }),
    });
    const data = await res.json();
    assert(
      res.ok && data.success && data.recommendation.recommendedSpecialty === 'Orthopedics',
      `Orthopedics recommendation verified (Specialty: ${data.recommendation?.recommendedSpecialty}, Confidence: ${data.recommendation?.confidence})`
    );
    assert(
      data.matchingDoctors.some((d) => d.specialization.includes('Ortho')),
      `Matching orthopedic specialists returned from real DB (${data.matchingDoctors[0]?.name})`
    );
  } catch (err) {
    assert(false, `Orthopedics test error: ${err.message}`);
  }

  // 1c. Cardiology
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I feel palpitations and heart racing with mild exertion.' }),
    });
    const data = await res.json();
    assert(
      res.ok && data.success && data.recommendation.recommendedSpecialty === 'Cardiology',
      `Cardiology recommendation verified (Specialty: ${data.recommendation?.recommendedSpecialty})`
    );
    assert(
      data.matchingDoctors.some((d) => d.specialization.includes('Cardio')),
      `Matching cardiologists returned from real DB (${data.matchingDoctors[0]?.name})`
    );
  } catch (err) {
    assert(false, `Cardiology test error: ${err.message}`);
  }

  // 1d. Urology
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I am experiencing burning urination and flank pain.' }),
    });
    const data = await res.json();
    assert(
      res.ok && data.success && data.recommendation.recommendedSpecialty === 'Urology',
      `Urology recommendation verified (Specialty: ${data.recommendation?.recommendedSpecialty})`
    );
    assert(
      data.matchingDoctors.some((d) => d.specialization.includes('Uro')),
      `Matching urologists returned from real DB (${data.matchingDoctors[0]?.name})`
    );
  } catch (err) {
    assert(false, `Urology test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Empty & Whitespace Input
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 2: Empty & Whitespace Input Validation ---');
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: '   ' }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.success === false, `Empty input correctly rejected with HTTP 400 ("${data.message}")`);
  } catch (err) {
    assert(false, `Empty input test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Very Long Input (> 1500 characters)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 3: Very Long Input Validation (> 1500 chars) ---');
  try {
    const longText = 'I have a headache. '.repeat(100); // ~1900 chars
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: longText }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.success === false, `Oversized input correctly rejected with HTTP 400 ("${data.message}")`);
  } catch (err) {
    assert(false, `Long input test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Invalid API Request (Missing Body / Bad Type)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 4: Invalid API Request ---');
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ wrongField: 12345 }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.success === false, `Missing symptoms parameter correctly rejected with HTTP 400`);
  } catch (err) {
    assert(false, `Invalid request test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Transparent Rule-Based Baseline Labeling
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 5: Transparent Baseline Methodology Labeling ---');
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'Knee joint pain after morning jogging' }),
    });
    const data = await res.json();
    const methodology = data.recommendation?.methodology;
    assert(
      methodology?.is_trained_ml === false && methodology?.label.includes('Rule-Based'),
      `Explicitly labeled as transparent rule-based clinical baseline (is_trained_ml: false, label: "${methodology?.label}")`
    );
    assert(
      methodology?.disclaimer.includes('does not formulate medical diagnoses'),
      `Disclaimer emphasizes non-diagnostic outpatient discovery`
    );
  } catch (err) {
    assert(false, `Methodology label test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Generalized Symptoms / Fallback
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 6: Generalized Symptoms & Outpatient Triage Fallback ---');
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I am feeling generally unwell, tired and run down lately.' }),
    });
    const data = await res.json();
    assert(
      res.ok && data.recommendation.recommendedSpecialty === 'General Medicine',
      `Non-specific symptoms safely routed to General Medicine (Specialty: ${data.recommendation.recommendedSpecialty})`
    );
    assert(
      data.matchingDoctors.length > 0,
      `Fallback provides real hospital consultants (${data.matchingDoctors.length} doctors found)`
    );
  } catch (err) {
    assert(false, `Fallback test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Urgent Red-Flag Safety Warning (Phase 4)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 7: Emergency Red-Flag Triage & Safety Warnings ---');
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I have severe crushing chest pain radiating to left arm and cannot breathe.' }),
    });
    const data = await res.json();
    assert(
      data.recommendation.isUrgent === true && data.recommendation.urgency === 'urgent',
      `Emergency red-flag symptom correctly flagged with urgency="urgent" and isUrgent=true`
    );
    assert(
      data.recommendation.emergencyWarning.includes('1800-200-FLOW') || data.recommendation.emergencyWarning.includes('112'),
      `Prominent urgent safety warning provided with emergency helpline desk`
    );
  } catch (err) {
    assert(false, `Red flag test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 8 & 9: Doctor Recommendation Flow & Booking Navigation Link
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 8 & 9: Doctor Recommendation Flow & Booking Links ---');
  try {
    const res = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: patientCookie },
      body: JSON.stringify({ symptoms: 'I have persistent migraine and tingling in fingers.' }),
    });
    const data = await res.json();
    const doc = data.matchingDoctors[0];
    assert(
      doc && doc.id && doc.name && doc.specialization && doc.consultationFee,
      `Matching doctor object contains valid clinical fields (ID: ${doc?.id}, Name: ${doc?.name}, Fee: ₹${doc?.consultationFee})`
    );
    assert(
      doc.bookingUrl === `/book?doctorId=${doc.id}`,
      `Booking navigation URL correctly structured (${doc.bookingUrl})`
    );
    assert(
      Array.isArray(doc.availabilities),
      `Doctor availabilities array attached for real-time slot scheduling (${doc.availabilities.length} availability windows)`
    );
  } catch (err) {
    assert(false, `Doctor recommendation flow test error: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 10: Authentication and Authorization Guard
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 10: Authentication and RBAC Integration ---');
  try {
    const unauthRes = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No cookie!
      body: JSON.stringify({ symptoms: 'I have joint pain in my knee' }),
    });
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.success === false,
      `Unauthenticated access properly rejected with HTTP 401 Unauthorized ("${unauthData.message}")`
    );
  } catch (err) {
    assert(false, `Auth guard test error: ${err.message}`);
  }

  // Test Admin access
  try {
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mediflow.com', password: 'password123' }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0];
    const adminRes = await fetch(`${baseUrl}/api/ai/specialty-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ symptoms: 'Persistent skin rash and itching' }),
    });
    const adminData = await adminRes.json();
    assert(
      adminRes.ok && adminData.success,
      `Admin user can access specialty recommendation (role: ADMIN, specialty: ${adminData.recommendation?.recommendedSpecialty})`
    );
  } catch (err) {
    assert(false, `Admin access test error: ${err.message}`);
  }

  console.log(`\n========================================================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

