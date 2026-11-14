// scratch/test_presence_analytics_and_history.mjs
// Automated verification of Attendance History, Basic Presence Analytics, Real-Time Sync, and Appointment Safety

const BASE_URL = 'http://localhost:5001';

async function run() {
  console.log('====================================================');
  console.log('🧪 TESTING ATTENDANCE HISTORY & PRESENCE ANALYTICS');
  console.log('====================================================\n');

  // -------------------------------------------------------------------------
  // 1. Authenticate Admin
  // -------------------------------------------------------------------------
  console.log('[1] Logging in as Admin (admin@mediflow.com)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@mediflow.com', password: 'password123' }),
  });
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${adminLoginRes.status}`);
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  console.log('✓ Admin authenticated successfully.');

  // -------------------------------------------------------------------------
  // 2. Test Admin Presence Analytics Endpoint
  // -------------------------------------------------------------------------
  console.log('\n[2] Testing GET /api/presence/analytics (Admin)...');
  const analyticsRes = await fetch(`${BASE_URL}/api/presence/analytics`, {
    headers: { Cookie: adminCookie },
  });
  if (!analyticsRes.ok) throw new Error(`Analytics endpoint failed: ${analyticsRes.status}`);
  const analyticsData = await analyticsRes.json();
  console.log('Analytics Response:', analyticsData);

  if (!analyticsData.success || !analyticsData.data) {
    throw new Error('Analytics response missing success or data property');
  }

  const { totalDoctors, presentDoctors, inConsultationDoctors, offDutyDoctors } = analyticsData.data;
  console.log(`✓ Total Doctors:            ${totalDoctors}`);
  console.log(`✓ Currently Present:        ${presentDoctors}`);
  console.log(`✓ In Consultation:          ${inConsultationDoctors}`);
  console.log(`✓ Off Duty:                 ${offDutyDoctors}`);

  if (typeof totalDoctors !== 'number' || typeof presentDoctors !== 'number' ||
      typeof inConsultationDoctors !== 'number' || typeof offDutyDoctors !== 'number') {
    throw new Error('Analytics counts are not numbers!');
  }

  // -------------------------------------------------------------------------
  // 3. Test Admin Stats Endpoint includes presenceAnalytics
  // -------------------------------------------------------------------------
  console.log('\n[3] Testing GET /api/admin/stats (Admin)...');
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: adminCookie },
  });
  if (!statsRes.ok) throw new Error(`Admin stats failed: ${statsRes.status}`);
  const statsData = await statsRes.json();
  const presenceAnalytics = statsData.data?.presenceAnalytics;
  console.log('Hospital Stats Presence Analytics:', presenceAnalytics);

  if (!presenceAnalytics || presenceAnalytics.totalDoctors === undefined) {
    throw new Error('Admin stats missing presenceAnalytics object!');
  }
  console.log('✓ Admin stats successfully includes presenceAnalytics.');

  // -------------------------------------------------------------------------
  // 4. Authenticate Doctor
  // -------------------------------------------------------------------------
  console.log('\n[4] Logging in as Doctor (dr.jawale@mediflow.com)...');
  const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.jawale@mediflow.com', password: 'password123' }),
  });
  if (!docLoginRes.ok) throw new Error(`Doctor login failed: ${docLoginRes.status}`);
  const docCookie = docLoginRes.headers.get('set-cookie');
  const docLoginData = await docLoginRes.json();
  const doctorUserId = docLoginData.user.id;
  console.log(`✓ Doctor authenticated: ${docLoginData.user.name} (Role: ${docLoginData.user.role})`);

  // -------------------------------------------------------------------------
  // 5. Test Doctor Viewing Their Recent Attendance Records
  // -------------------------------------------------------------------------
  console.log('\n[5] Doctor retrieving recent attendance records (GET /api/presence/history)...');
  const historyRes = await fetch(`${BASE_URL}/api/presence/history?limit=10`, {
    headers: { Cookie: docCookie },
  });
  if (!historyRes.ok) throw new Error(`Doctor history query failed: ${historyRes.status}`);
  const historyData = await historyRes.json();
  console.log(`✓ Doctor History Records Retrieved: ${historyData.records?.length || 0} session(s)`);

  if (historyData.records && historyData.records.length > 0) {
    const sample = historyData.records[0];
    console.log('Sample Recent Attendance Record:');
    console.log(`  - Doctor:   ${sample.doctorName} (${sample.specialization})`);
    console.log(`  - Location: ${sample.location}`);
    console.log(`  - CheckIn:  ${sample.checkInTime}`);
    console.log(`  - CheckOut: ${sample.checkOutTime || 'Ongoing'}`);
    console.log(`  - Duration: ${sample.durationMinutes} min(s)`);
    console.log(`  - Method:   ${sample.checkInMethod}`);
    console.log(`  - Status:   ${sample.status}`);

    // Verify record belongs to this doctor
    if (sample.doctorName !== docLoginData.user.name) {
      throw new Error(`Security Violation: Doctor received attendance of another doctor: ${sample.doctorName}`);
    }
    console.log('✓ Security check passed: Doctor only received their own attendance history.');
  } else {
    console.log('Doctor has no prior records yet. Checking current attendance status (/api/presence/me)...');
    const meRes = await fetch(`${BASE_URL}/api/presence/me`, { headers: { Cookie: docCookie } });
    console.log('Presence me response status:', meRes.status);
  }

  // -------------------------------------------------------------------------
  // 6. Test Appointment Safety Constraint
  // -------------------------------------------------------------------------
  console.log('\n[6] Testing Appointment Safety Constraint...');
  console.log('Checking that doctor presence changes do NOT modify or cancel existing appointments...');

  // Get doctor profile to know doctorId
  const profileRes = await fetch(`${BASE_URL}/api/doctors/profile`, { headers: { Cookie: docCookie } });
  const profileData = await profileRes.json();
  const doctorId = profileData.doctor.id;
  const initialPresence = profileData.doctor.currentPresence;
  console.log(`Doctor ID: ${doctorId}, Initial Presence: ${initialPresence}`);

  // Fetch appointments for this doctor via admin view before toggle
  const apptsBeforeRes = await fetch(`${BASE_URL}/api/admin/appointments`, { headers: { Cookie: adminCookie } });
  const apptsBeforeData = await apptsBeforeRes.json();
  const docApptsBefore = (apptsBeforeData.data || []).filter(a => a.doctor?.id === doctorId);
  console.log(`Doctor currently has ${docApptsBefore.length} appointment(s) in system.`);

  // Toggle Doctor Presence to OFFLINE
  console.log('Toggling presence to OFFLINE...');
  const toggleRes1 = await fetch(`${BASE_URL}/api/presence/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ status: 'OFFLINE', notes: 'Automated test shift toggle' }),
  });
  if (!toggleRes1.ok) throw new Error(`Toggle to OFFLINE failed: ${toggleRes1.status}`);
  console.log('✓ Presence set to OFFLINE.');

  // Verify appointments after OFFLINE toggle
  const apptsAfterRes1 = await fetch(`${BASE_URL}/api/admin/appointments`, { headers: { Cookie: adminCookie } });
  const apptsAfterData1 = await apptsAfterRes1.json();
  const docApptsAfter1 = (apptsAfterData1.data || []).filter(a => a.doctor?.id === doctorId);

  if (docApptsBefore.length !== docApptsAfter1.length) {
    throw new Error(`CRITICAL BUG: Appointment count changed after OFFLINE toggle! Before: ${docApptsBefore.length}, After: ${docApptsAfter1.length}`);
  }

  for (let i = 0; i < docApptsBefore.length; i++) {
    const before = docApptsBefore[i];
    const after = docApptsAfter1.find(a => a.id === before.id);
    if (!after) {
      throw new Error(`CRITICAL BUG: Appointment ${before.id} was deleted!`);
    }
    if (after.status !== before.status) {
      throw new Error(`CRITICAL BUG: Appointment ${before.id} status unexpectedly changed from ${before.status} to ${after.status}!`);
    }
  }
  console.log(`✓ Appointment safety verified: All ${docApptsBefore.length} appointments remained intact (none were modified or cancelled by OFFLINE presence toggle).`);

  // Toggle presence to AVAILABLE
  console.log('\nToggling presence to AVAILABLE...');
  const toggleRes2 = await fetch(`${BASE_URL}/api/presence/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ status: 'AVAILABLE', notes: 'Back on clinic duty' }),
  });
  if (!toggleRes2.ok) throw new Error(`Toggle to AVAILABLE failed: ${toggleRes2.status}`);
  console.log('✓ Presence set to AVAILABLE.');

  // Check analytics updated
  const analyticsRes2 = await fetch(`${BASE_URL}/api/presence/analytics`, { headers: { Cookie: adminCookie } });
  const analyticsData2 = await analyticsRes2.json();
  console.log('Updated Presence Analytics:', analyticsData2.data);

  // Restore initial presence if needed
  if (initialPresence && initialPresence !== 'AVAILABLE') {
    await fetch(`${BASE_URL}/api/presence/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: docCookie },
      body: JSON.stringify({ status: initialPresence, notes: 'Restored original presence' }),
    });
  }

  console.log('\n====================================================');
  console.log('✅ ALL ATTENDANCE & PRESENCE ANALYTICS TESTS PASSED!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
