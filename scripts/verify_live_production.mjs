/**
 * Live Production Deployment Verification Script
 * Validates the live Render backend, Neon PostgreSQL database,
 * and live Vercel frontend deployment.
 */

const BACKEND_BASE = 'https://mediflow-api-bz27.onrender.com';
const FRONTEND_BASE = 'https://mediflow-ai-app.vercel.app';

async function verifyLiveProduction() {
  console.log('\n================================================================');
  console.log('🌐 MEDIFLOW AI: LIVE PRODUCTION DEPLOYMENT VERIFICATION');
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

  // 1. Live Render Backend Health Check
  console.log('--- 1. Live Backend Health & Database Connectivity ---');
  try {
    const healthRes = await fetch(`${BACKEND_BASE}/api/health`);
    assert(healthRes.status === 200, `GET /api/health returned HTTP 200`);
    const healthJson = await healthRes.json();
    assert(healthJson.success === true, 'Health check reports success: true');
    assert(healthJson.database?.connected === true, 'Database is connected to PostgreSQL');
    assert(healthJson.database?.totalUsers >= 17, `Total registered database users: ${healthJson.database?.totalUsers}`);
  } catch (err) {
    assert(false, `Backend health check failed: ${err.message}`);
  }

  // 2. Live Immersive Care Catalog Endpoints
  console.log('\n--- 2. Live Immersive Care Catalog API ---');
  try {
    const expRes = await fetch(`${BACKEND_BASE}/api/immersive/experiences`);
    assert(expRes.status === 200, 'GET /api/immersive/experiences returned HTTP 200');
    const expJson = await expRes.json();
    assert(expJson.success === true, 'Experiences endpoint returned success: true');
    assert(Array.isArray(expJson.data) && expJson.data.length >= 13, `Experiences count: ${expJson.data?.length}`);

    const modelRes = await fetch(`${BACKEND_BASE}/api/immersive/models`);
    assert(modelRes.status === 200, 'GET /api/immersive/models returned HTTP 200');
    const modelJson = await modelRes.json();
    assert(modelJson.success === true, 'Models endpoint returned success: true');
    assert(Array.isArray(modelJson.data) && modelJson.data.length >= 8, `Models count: ${modelJson.data?.length}`);
  } catch (err) {
    assert(false, `Immersive catalog API failed: ${err.message}`);
  }

  // 3. Live Vercel Frontend Pages
  console.log('\n--- 3. Live Vercel Production Frontend (SPA Routing) ---');
  const pagesToTest = [
    { path: '/', label: 'Homepage / Portal' },
    { path: '/login', label: 'Login Authentication Page' },
    { path: '/register', label: 'Registration Page' },
    { path: '/doctors', label: 'Doctor Specialist Directory' },
    { path: '/health-assistant', label: 'AI Health Assistant' },
    { path: '/immersive', label: 'Immersive Care 3.0 Dashboard' },
    { path: '/immersive/anatomy', label: 'AR Human Anatomy Explorer' },
    { path: '/immersive/organs', label: '3D Organ Explorer' },
    { path: '/immersive/hospital', label: 'Virtual Hospital Walkthrough' },
    { path: '/immersive/training', label: 'VR Clinical Simulations' },
    { path: '/immersive/progress', label: 'Learning Progress & Badges' },
  ];

  for (const page of pagesToTest) {
    try {
      const res = await fetch(`${FRONTEND_BASE}${page.path}`);
      assert(res.status === 200, `[${res.status}] ${page.label} (${page.path})`);
      const text = await res.text();
      assert(text.includes('<!DOCTYPE html>') || text.includes('<html'), `Returns valid HTML document bundle`);
    } catch (err) {
      assert(false, `${page.label} failed: ${err.message}`);
    }
  }

  // 4. Live 3D Assets on Production
  console.log('\n--- 4. Live 3D Binary GLB Assets on Production ---');
  const models = [
    'anatomy_body.glb',
    'heart.glb',
    'brain.glb',
    'lungs.glb',
    'liver.glb',
    'kidneys.glb',
    'stomach.glb',
    'hospital_suite.glb',
  ];

  for (const m of models) {
    try {
      const res = await fetch(`${FRONTEND_BASE}/models/${m}`, { method: 'HEAD' });
      assert(res.status === 200, `Asset /models/${m} is accessible (HTTP 200)`);
    } catch (err) {
      assert(false, `Asset ${m} check failed: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`LIVE PRODUCTION AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

verifyLiveProduction().catch((err) => {
  console.error(err);
  process.exit(1);
});
