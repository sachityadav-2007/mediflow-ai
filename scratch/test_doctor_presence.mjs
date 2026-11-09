// scratch/test_doctor_presence.mjs
// Automated verification of Smart Doctor Presence & QR Attendance Workflow

const BASE_URL = 'http://localhost:5001';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING SMART DOCTOR PRESENCE WORKFLOW TEST');
  console.log('====================================================');

  // Step 1: Doctor Login
  console.log('\n[1] Logging in as Doctor (dr.jawale@mediflow.com)...');
  const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.jawale@mediflow.com', password: 'password123' }),
  });
  if (!docLoginRes.ok) {
    throw new Error(`Doctor login failed: ${docLoginRes.status} ${await docLoginRes.text()}`);
  }
  const docCookie = docLoginRes.headers.get('set-cookie');
  const docLoginData = await docLoginRes.json();
  console.log(`✓ Doctor authenticated: ${docLoginData.user.name} (${docLoginData.user.role})`);

  // Step 2: Query Initial Attendance State
  console.log('\n[2] Checking initial doctor attendance status (/api/presence/me)...');
  const initialMeRes = await fetch(`${BASE_URL}/api/presence/me`, {
    headers: { Cookie: docCookie },
  });
  const initialMe = await initialMeRes.json();
  console.log(`Initial Status: isCheckedIn=${initialMe.isCheckedIn}, currentPresence=${initialMe.doctor?.currentPresence}`);

  // If already checked in from prior run, check out first
  if (initialMe.isCheckedIn) {
    console.log('Doctor was checked in from prior test. Checking out for clean baseline...');
    const coRes = await fetch(`${BASE_URL}/api/presence/qr/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: docCookie },
      body: JSON.stringify({ notes: 'Resetting test session' }),
    });
    console.log(`Cleanup checkout: ${coRes.status}`);
  }

  // Step 3: Fetch Active Hospital QR Gates
  console.log('\n[3] Fetching active hospital QR gates (/api/presence/qr/active)...');
  const activeQrRes = await fetch(`${BASE_URL}/api/presence/qr/active`, {
    headers: { Cookie: docCookie },
  });
  if (!activeQrRes.ok) {
    throw new Error(`Failed to fetch active QR codes: ${activeQrRes.status} ${await activeQrRes.text()}`);
  }
  const activeQrData = await activeQrRes.json();
  console.log(`Active QR Gates count: ${activeQrData.count}`);
  if (activeQrData.count === 0 || !activeQrData.qrCodes[0]?.signedToken) {
    throw new Error('No active signed QR token returned by /api/presence/qr/active');
  }
  const testGate = activeQrData.qrCodes[0];
  console.log(`✓ Target Gate: "${testGate.location}" (Code: ${testGate.code})`);

  // Step 4: Doctor QR Check-In
  console.log('\n[4] Performing Doctor QR Check-In (/api/presence/qr/check-in)...');
  const checkInRes = await fetch(`${BASE_URL}/api/presence/qr/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ token: testGate.signedToken }),
  });
  if (!checkInRes.ok) {
    throw new Error(`Doctor check-in failed: ${checkInRes.status} ${await checkInRes.text()}`);
  }
  const checkInData = await checkInRes.json();
  console.log(`✓ Check-In Success! Presence updated to: ${checkInData.currentPresence}`);
  console.log(`  Location: ${checkInData.location}`);
  console.log(`  Check-in Time: ${checkInData.checkInTime}`);

  // Step 5: Verify Presence State via /api/presence/me
  console.log('\n[5] Verifying updated attendance state via /api/presence/me...');
  const verifyMeRes = await fetch(`${BASE_URL}/api/presence/me`, {
    headers: { Cookie: docCookie },
  });
  const verifyMe = await verifyMeRes.json();
  if (!verifyMe.isCheckedIn || verifyMe.doctor?.currentPresence !== 'PRESENT') {
    throw new Error(`Presence verification mismatch: isCheckedIn=${verifyMe.isCheckedIn}, currentPresence=${verifyMe.doctor?.currentPresence}`);
  }
  console.log(`✓ Verified: Doctor is marked CHECKED_IN and PRESENT at "${verifyMe.activeSession.location}"`);

  // Step 6: Anti-Duplicate Prevention Test
  console.log('\n[6] Attempting DUPLICATE Check-In (Should be rejected with 409 Conflict)...');
  const dupCheckInRes = await fetch(`${BASE_URL}/api/presence/qr/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ token: testGate.signedToken }),
  });
  console.log(`Duplicate check-in response status: ${dupCheckInRes.status}`);
  const dupCheckInData = await dupCheckInRes.json();
  console.log(`Rejection message: "${dupCheckInData.message}"`);
  if (dupCheckInRes.status !== 409) {
    throw new Error(`Expected 409 Conflict for duplicate check-in, got ${dupCheckInRes.status}`);
  }
  console.log('✓ Duplicate check-in was successfully prevented!');

  // Step 7: Admin Verification
  console.log('\n[7] Logging in as Admin (admin@mediflow.com)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@mediflow.com', password: 'password123' }),
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  const adminLoginData = await adminLoginRes.json();
  console.log(`✓ Admin authenticated: ${adminLoginData.user.name}`);

  console.log('Inspecting doctor presence in Admin Directory (/api/admin/doctors)...');
  const adminDocsRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
    headers: { Cookie: adminCookie },
  });
  const adminDocsData = await adminDocsRes.json();
  const doctorList = adminDocsData.data || adminDocsData.doctors || [];
  console.log('Sample doctor from admin:', doctorList[0]?.id, doctorList[0]?.user?.name, 'Looking for:', verifyMe.doctor.id);
  const foundDoctor = doctorList.find((d) => d.id === verifyMe.doctor.id);
  console.log(`Admin sees Dr. ${foundDoctor?.user?.name || foundDoctor?.name} presence as: ${foundDoctor?.currentPresence}`);
  if (foundDoctor.currentPresence !== 'PRESENT') {
    throw new Error(`Admin directory mismatch: expected PRESENT, got ${foundDoctor.currentPresence}`);
  }
  console.log('✓ Admin correctly observes doctor as PRESENT');

  // Step 8: Doctor Check-Out
  console.log('\n[8] Performing Doctor Check-Out (/api/presence/qr/check-out)...');
  const checkOutRes = await fetch(`${BASE_URL}/api/presence/qr/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ notes: 'Completed OPD morning shift' }),
  });
  if (!checkOutRes.ok) {
    throw new Error(`Doctor check-out failed: ${checkOutRes.status} ${await checkOutRes.text()}`);
  }
  const checkOutData = await checkOutRes.json();
  console.log(`✓ Check-Out Success! Presence updated to: ${checkOutData.currentPresence}`);
  console.log(`  Duration: ${checkOutData.durationMinutes} minute(s)`);
  console.log(`  Checkout Time: ${checkOutData.checkOutTime}`);

  // Step 9: Verify Status is OFFLINE
  console.log('\n[9] Verifying doctor presence status is now OFFLINE (/api/presence/me)...');
  const postMeRes = await fetch(`${BASE_URL}/api/presence/me`, {
    headers: { Cookie: docCookie },
  });
  const postMe = await postMeRes.json();
  console.log(`Post-Checkout Status: isCheckedIn=${postMe.isCheckedIn}, currentPresence=${postMe.doctor?.currentPresence}`);
  if (postMe.isCheckedIn || postMe.doctor?.currentPresence !== 'OFFLINE') {
    throw new Error(`Expected isCheckedIn=false and currentPresence=OFFLINE, got isCheckedIn=${postMe.isCheckedIn}, currentPresence=${postMe.doctor?.currentPresence}`);
  }
  console.log('✓ Verified: Doctor is marked OFFLINE (Off Duty / Unavailable)');

  // Step 10: Invalid Check-Out Prevention (Already Checked Out)
  console.log('\n[10] Attempting Check-Out when NOT checked in (Should be rejected with 404)...');
  const invalidCoRes = await fetch(`${BASE_URL}/api/presence/qr/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ notes: 'Extra checkout' }),
  });
  console.log(`Invalid checkout response status: ${invalidCoRes.status}`);
  const invalidCoData = await invalidCoRes.json();
  console.log(`Rejection message: "${invalidCoData.message}"`);
  if (invalidCoRes.status !== 404 && invalidCoRes.status !== 400) {
    throw new Error(`Expected 404/400 for checkout without active session, got ${invalidCoRes.status}`);
  }
  console.log('✓ Invalid checkout was successfully prevented!');

  // Step 11: Appointment System Integration Test (Doctor OFFLINE vs PRESENT)
  console.log('\n[11] Verifying Appointment System integration with presence status...');
  // Doctor is currently OFFLINE
  const offlineSlotsRes = await fetch(`${BASE_URL}/api/appointments/slots/${verifyMe.doctor.id}?date=2026-11-25`, {
    headers: { Cookie: docCookie },
  });
  const offlineSlots = await offlineSlotsRes.json();
  console.log(`When OFFLINE: available=${offlineSlots.available}, reason="${offlineSlots.reason}", message="${offlineSlots.message}"`);
  if (offlineSlots.available !== false || offlineSlots.reason !== 'OFFLINE') {
    throw new Error(`Expected available=false with reason OFFLINE, got available=${offlineSlots.available}`);
  }
  console.log('✓ Appointment slot system correctly disables booking while doctor is OFFLINE');

  // Now Check In again to test slot availability when PRESENT
  console.log('Checking doctor back in to test slot availability while PRESENT...');
  await fetch(`${BASE_URL}/api/presence/qr/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ token: testGate.signedToken }),
  });
  const onlineSlotsRes = await fetch(`${BASE_URL}/api/appointments/slots/${verifyMe.doctor.id}?date=2026-11-25`, {
    headers: { Cookie: docCookie },
  });
  const onlineSlots = await onlineSlotsRes.json();
  console.log(`When PRESENT: available=${onlineSlots.available}, slotsCount=${onlineSlots.slots?.length}`);
  if (!onlineSlots.available || !onlineSlots.slots || onlineSlots.slots.length === 0) {
    throw new Error('Expected available=true with slots when doctor is PRESENT');
  }
  console.log('✓ Appointment slot system correctly unlocks consultation slots when doctor is PRESENT');

  // Clean up: check out doctor
  await fetch(`${BASE_URL}/api/presence/qr/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: docCookie },
    body: JSON.stringify({ notes: 'Test suite cleanup' }),
  });
  console.log('✓ Cleanup checkout complete');

  console.log('\n====================================================');
  console.log('🎉 ALL 11 SMART DOCTOR PRESENCE CHECKS PASSED 100%!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
