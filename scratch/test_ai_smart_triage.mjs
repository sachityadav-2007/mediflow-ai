import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 MediFlow AI 2.0 — Smart Symptom Triage Verification');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // ---------------------------------------------------------------
  // 1. Codebase structural checks
  // ---------------------------------------------------------------
  console.log('--- 1. Structural Requirements & Code Checks ---');
  const triageServiceCode = fs.readFileSync(
    path.join(process.cwd(), 'backend/src/services/triageService.js'),
    'utf-8'
  );
  assert(
    triageServiceCode.includes('EMERGENCY_PATTERNS') &&
      triageServiceCode.includes('crushing chest pain') &&
      triageServiceCode.includes('slurred speech'),
    'triageService.js implements safety-first emergency detection patterns'
  );
  assert(
    triageServiceCode.includes('DEPARTMENT_CATALOG') &&
      triageServiceCode.includes('Cardiology') &&
      triageServiceCode.includes('Neurology') &&
      triageServiceCode.includes('Orthopedics') &&
      triageServiceCode.includes('Urology') &&
      triageServiceCode.includes('General Medicine'),
    'triageService.js contains multi-department clinical ontology'
  );
  assert(
    triageServiceCode.includes('saveTriageRecord') &&
      triageServiceCode.includes('getPatientTriageHistory'),
    'triageService.js provides Prisma database history persistence functions'
  );

  const prismaSchema = fs.readFileSync(
    path.join(process.cwd(), 'backend/prisma/schema.prisma'),
    'utf-8'
  );
  assert(
    prismaSchema.includes('model TriageHistory') &&
      prismaSchema.includes('triageHistories  TriageHistory[]'),
    'Prisma schema includes TriageHistory model and Patient relation'
  );

  const healthPageCode = fs.readFileSync(
    path.join(process.cwd(), 'frontend/src/pages/HealthAssistantPage.jsx'),
    'utf-8'
  );
  assert(
    healthPageCode.includes('Important Medical Safety Disclaimer') ||
      healthPageCode.includes('Clinical Disclaimer'),
    'HealthAssistantPage displays prominent non-diagnostic medical disclaimer'
  );
  assert(
    healthPageCode.includes('duration') && healthPageCode.includes('severity'),
    'HealthAssistantPage includes structured duration and severity inputs'
  );
  assert(
    healthPageCode.includes('activeTab') && healthPageCode.includes('Your Past Symptom Assessments'),
    'HealthAssistantPage includes patient assessment history view'
  );

  // ---------------------------------------------------------------
  // 2. Authentication & Security (RBAC)
  // ---------------------------------------------------------------
  console.log('\n--- 2. Security & Unauthenticated Access Enforcement ---');
  // Unauthenticated POST /api/triage/analyze
  const unauthPost = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms: 'I have fever' }),
  });
  assert(
    unauthPost.status === 401,
    `Unauthenticated POST /api/triage/analyze strictly rejected (HTTP ${unauthPost.status})`
  );

  // Unauthenticated GET /api/triage/history
  const unauthGet = await fetch(`${BASE_URL}/api/triage/history`);
  assert(
    unauthGet.status === 401,
    `Unauthenticated GET /api/triage/history strictly rejected (HTTP ${unauthGet.status})`
  );

  // Authenticate as Patient Rahul Verma
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rahul.verma@example.com',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.success, 'Patient Rahul Verma authenticated successfully');
  const cookieHeader = loginRes.headers.get('set-cookie') || '';
  const sessionCookie = cookieHeader.split(';')[0];

  // ---------------------------------------------------------------
  // 3. Test Scenario: Normal Symptoms (General Medicine)
  // ---------------------------------------------------------------
  console.log('\n--- 3. Scenario 1: Normal Symptoms (General Medicine) ---');
  const normalRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      symptoms: 'I have had a mild headache and fever for two days with general body ache.',
      duration: '1-3 days',
      severity: 'Mild',
    }),
  });
  const normalData = await normalRes.json();
  assert(
    normalRes.ok && normalData.success,
    `API analyzed normal symptoms successfully (HTTP ${normalRes.status})`
  );
  assert(
    normalData.recommendation.department === 'General Medicine',
    `Recommended department: ${normalData.recommendation.department}`
  );
  assert(
    normalData.recommendation.specialistType === 'General Physician',
    `Recommended specialist: ${normalData.recommendation.specialistType}`
  );
  assert(
    normalData.recommendation.urgency === 'Routine',
    `Urgency calibrated correctly as: ${normalData.recommendation.urgency}`
  );
  assert(
    normalData.recommendation.matchedSymptoms.length > 0,
    `Matched symptoms extracted: ${JSON.stringify(normalData.recommendation.matchedSymptoms)}`
  );
  assert(
    Boolean(normalData.historyId),
    `Assessment record persisted to PostgreSQL with ID: ${normalData.historyId}`
  );

  // ---------------------------------------------------------------
  // 4. Test Scenario: Distinct Specialties
  // ---------------------------------------------------------------
  console.log('\n--- 4. Scenario 2: Specialized Department Routing ---');
  // 4A: Orthopedics
  const orthoRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      symptoms: 'Severe knee pain and swelling after playing football, cannot bend joint.',
      duration: '< 24 hours',
      severity: 'Severe',
    }),
  });
  const orthoData = await orthoRes.json();
  assert(
    orthoData.recommendation.department === 'Orthopedics',
    `Orthopedic symptoms routed to: ${orthoData.recommendation.department} (${orthoData.recommendation.specialistType})`
  );
  assert(
    orthoData.recommendation.urgency === 'Urgent',
    `Severe orthopedic pain calibrated to urgency: ${orthoData.recommendation.urgency}`
  );
  assert(
    orthoData.matchingDoctors.some((d) => d.name === 'Dr. Rajesh Parasnis'),
    'Matched verified hospital orthopedic surgeon: Dr. Rajesh Parasnis'
  );

  // 4B: Urology
  const uroRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      symptoms: 'Burning sensation and frequent urination with lower pelvic discomfort.',
      duration: '3-7 days',
      severity: 'Moderate',
    }),
  });
  const uroData = await uroRes.json();
  assert(
    uroData.recommendation.department === 'Urology',
    `Urological symptoms routed to: ${uroData.recommendation.department} (${uroData.recommendation.specialistType})`
  );
  assert(
    uroData.matchingDoctors.some((d) => d.name === 'Dr. Ketan Vartak'),
    'Matched verified hospital urologist: Dr. Ketan Vartak'
  );

  // 4C: Cardiology
  const cardioRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      symptoms: 'Irregular heartbeat and palpitations when climbing stairs, high blood pressure.',
      duration: '1-2 weeks',
      severity: 'Moderate',
    }),
  });
  const cardioData = await cardioRes.json();
  assert(
    cardioData.recommendation.department === 'Cardiology',
    `Cardiovascular symptoms routed to: ${cardioData.recommendation.department} (${cardioData.recommendation.specialistType})`
  );

  // ---------------------------------------------------------------
  // 5. Test Scenario: Emergency Detection Circuit
  // ---------------------------------------------------------------
  console.log('\n--- 5. Scenario 3: Emergency Detection Circuit ---');
  const emergencyRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      symptoms: 'Sudden crushing chest pain radiating to left arm with cold sweat.',
      duration: '< 24 hours',
      severity: 'Severe',
    }),
  });
  const emergencyData = await emergencyRes.json();
  assert(
    emergencyData.recommendation.isEmergency === true,
    'Emergency safety circuit triggered (isEmergency = true)'
  );
  assert(
    emergencyData.recommendation.urgency === 'Emergency',
    `Urgency correctly escalated to: ${emergencyData.recommendation.urgency}`
  );
  assert(
    Boolean(emergencyData.recommendation.emergencyWarning),
    `Emergency warning displayed: "${emergencyData.recommendation.emergencyWarning.slice(0, 60)}..."`
  );

  // ---------------------------------------------------------------
  // 6. Test Scenario: Patient History Retrieval & Privacy
  // ---------------------------------------------------------------
  console.log('\n--- 6. Scenario 4: Patient History Persistence & Isolation ---');
  const historyRes = await fetch(`${BASE_URL}/api/triage/history`, {
    headers: { Cookie: sessionCookie },
  });
  const historyData = await historyRes.json();
  assert(
    historyRes.ok && historyData.success && Array.isArray(historyData.history),
    `Patient retrieved triage history records: ${historyData.history?.length} item(s)`
  );
  assert(
    historyData.history.length >= 3,
    'Recent triage assessments are correctly persisted in PostgreSQL database'
  );

  // Test single record deletion
  if (historyData.history.length > 0) {
    const itemToDelete = historyData.history[0];
    const deleteRes = await fetch(`${BASE_URL}/api/triage/history/${itemToDelete.id}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.ok && deleteData.success,
      `Patient successfully deleted own triage assessment record (${itemToDelete.id})`
    );
  }

  // ---------------------------------------------------------------
  // 7. Input Validation Edge Cases
  // ---------------------------------------------------------------
  console.log('\n--- 7. Input Validation Edge Cases ---');
  const shortRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ symptoms: 'hi' }),
  });
  assert(shortRes.status === 400, 'Rejects inputs shorter than 3 characters with HTTP 400');

  const emptyRes = await fetch(`${BASE_URL}/api/triage/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({}),
  });
  assert(emptyRes.status === 400, 'Rejects empty request payload with HTTP 400');

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');
}

runTests().catch(console.error);

