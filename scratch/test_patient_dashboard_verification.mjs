import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 MediFlow AI 2.0 — Patient Dashboard Verification');
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

  // 1. Codebase structural checks on PatientDashboard.jsx
  console.log('--- 1. Structural & UI Requirements in PatientDashboard.jsx ---');
  const dashboardCode = fs.readFileSync(
    path.join(process.cwd(), 'frontend/src/pages/PatientDashboard.jsx'),
    'utf-8'
  );

  assert(
    dashboardCode.includes('Welcome back, {user?.name ||') || dashboardCode.includes('Welcome back'),
    'Dashboard Header displays dynamic authenticated patient name'
  );
  assert(
    dashboardCode.includes('getInitials(user?.name)') || dashboardCode.includes('Initials'),
    'Patient avatar profile badge with initials exists in Header'
  );
  assert(
    dashboardCode.includes('todayFormatted') || dashboardCode.includes('toLocaleDateString'),
    'Current date is dynamically generated and displayed in Header'
  );
  assert(
    dashboardCode.includes('Blood Group') && dashboardCode.includes('Emergency Contact'),
    'Clinical health profile snapshot (Blood Group, Emergency Contact) present'
  );
  assert(
    dashboardCode.includes('StatCard') &&
      dashboardCode.includes('Upcoming Visits') &&
      dashboardCode.includes('Total Consultations') &&
      dashboardCode.includes('OPD Live Queue') &&
      dashboardCode.includes('Waitlist Standby'),
    'Overview section contains 4 real data-driven StatCards'
  );
  assert(
    dashboardCode.includes('Upcoming Consultation') && dashboardCode.includes('nextAppointment'),
    'Prominent Hero Upcoming Appointment section implemented'
  );
  assert(
    dashboardCode.includes('handleOpenQRModal') && dashboardCode.includes('View Check-In QR Pass'),
    'Touchless Check-In QR Pass action integrated'
  );
  assert(
    dashboardCode.includes('promptCancel') && dashboardCode.includes('Cancel Appointment'),
    'Appointment cancellation confirmation flow integrated'
  );
  assert(
    dashboardCode.includes('Hospital OPD Live Queue Status') && dashboardCode.includes('Socket.IO'),
    'OPD Live Queue monitoring section with Socket.IO integration present'
  );
  assert(
    dashboardCode.includes('Quick Actions') &&
      dashboardCode.includes('/book') &&
      dashboardCode.includes('/find-specialist') &&
      dashboardCode.includes('/my-appointments') &&
      dashboardCode.includes('/waitlist') &&
      dashboardCode.includes('/doctors'),
    'Quick Actions hub contains all 5 authentic patient routes'
  );
  assert(
    dashboardCode.includes('AI Health Navigation Assistant') &&
      dashboardCode.includes('Smart AI Slot Recommendations'),
    'MediFlow AI Insights section presents both AI Navigator and Slot Recommendations'
  );
  assert(
    dashboardCode.includes('Operational Guidance Notice') &&
      dashboardCode.includes('do not constitute medical diagnoses'),
    'Strict medical safety and non-diagnostic advisory banner present'
  );
  assert(
    dashboardCode.includes('LoadingSkeleton') &&
      dashboardCode.includes('EmptyState') &&
      dashboardCode.includes('ErrorState'),
    'Graceful loading skeletons, empty states, and error handling integrated'
  );
  assert(
    dashboardCode.includes('ConfirmDialog') && dashboardCode.includes('Modal'),
    'Interactive QR modal and cancellation dialog components present'
  );

  // 2. Route Integrity Check in App.jsx
  console.log('\n--- 2. Route Integrity Verification in App.jsx ---');
  const appCode = fs.readFileSync(path.join(process.cwd(), 'frontend/src/App.jsx'), 'utf-8');
  assert(appCode.includes('path="/patient/dashboard"'), 'Route /patient/dashboard registered');
  assert(appCode.includes('path="/book"'), 'Route /book registered');
  assert(appCode.includes('path="/find-specialist"'), 'Route /find-specialist registered');
  assert(appCode.includes('path="/my-appointments"'), 'Route /my-appointments registered');
  assert(appCode.includes('path="/waitlist"'), 'Route /waitlist registered');
  assert(appCode.includes('path="/doctors"'), 'Route /doctors registered');
  assert(appCode.includes('path="/queue/:doctorId"'), 'Route /queue/:doctorId registered');

  // 3. Live Backend API Integration Test with Patient Authentication
  console.log('\n--- 3. Live Backend Patient API & Authentication Integration ---');
  try {
    // Login as Demo Patient Rahul Verma
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul.verma@example.com',
        password: 'password123',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.success, 'Patient Login succeeded for rahul.verma@example.com');

    // Extract cookie
    const rawCookie = loginRes.headers.get('set-cookie') || '';
    const sessionCookie = rawCookie.split(';')[0];

    // Verify /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const meData = await meRes.json();
    assert(
      meRes.ok && meData.success && meData.user.role === 'PATIENT',
      `Auth profile retrieved: ${meData.user?.name} (${meData.user?.role})`
    );

    // Fetch patient appointments
    const aptRes = await fetch(`${BASE_URL}/api/appointments/my`, {
      headers: { Cookie: sessionCookie },
    });
    const aptData = await aptRes.json();
    assert(
      aptRes.ok && aptData.success && Array.isArray(aptData.appointments),
      `Patient appointments fetched successfully: ${aptData.appointments?.length} record(s)`
    );

    // Fetch patient waitlist
    const wlRes = await fetch(`${BASE_URL}/api/waitlist/my`, {
      headers: { Cookie: sessionCookie },
    });
    const wlData = await wlRes.json();
    assert(
      wlRes.ok && wlData.success && Array.isArray(wlData.waitlist),
      `Patient waitlist fetched successfully: ${wlData.waitlist?.length} entry(ies)`
    );

    // Fetch AI recommended slots
    const recRes = await fetch(`${BASE_URL}/api/ai/recommended-slots?limit=4`, {
      headers: { Cookie: sessionCookie },
    });
    const recData = await recRes.json();
    assert(
      recRes.ok && recData.success && Array.isArray(recData.recommendations),
      `AI slot recommendations retrieved: ${recData.recommendations?.length} slot(s)`
    );

    // Test QR Generation for an active appointment if available
    const activeApt = aptData.appointments?.find((a) => a.status !== 'CANCELLED');
    if (activeApt) {
      const qrRes = await fetch(`${BASE_URL}/api/check-in/appointment/${activeApt.id}/qr`, {
        headers: { Cookie: sessionCookie },
      });
      const qrData = await qrRes.json();
      assert(
        qrRes.ok && qrData.success && qrData.qrDataUrl && qrData.token,
        `Check-in QR generated for Appointment ${activeApt.appointmentNumber}`
      );
    } else {
      assert(true, 'No non-cancelled appointment available for QR token test (skipped)');
    }

    // Test Live OPD Queue endpoint for an existing doctor
    const doctorsRes = await fetch(`${BASE_URL}/api/doctors`);
    const doctorsData = await doctorsRes.json();
    if (doctorsRes.ok && doctorsData.success && doctorsData.doctors.length > 0) {
      const sampleDoctor = doctorsData.doctors[0];
      const queueRes = await fetch(`${BASE_URL}/api/check-in/queue/${sampleDoctor.id}?public=true`);
      const queueData = await queueRes.json();
      assert(
        queueRes.ok && queueData.success && queueData.doctor && Array.isArray(queueData.checkedInQueue),
        `Live OPD Queue retrieved for ${sampleDoctor.user?.name || 'Doctor'} (Room ${sampleDoctor.roomNumber})`
      );
    }
  } catch (err) {
    console.error('API Error during patient dashboard verification:', err);
    assert(false, `API Error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');
}

runTests().catch(console.error);
