/**
 * MediFlow AI 2.0 — Real-Time Notification System Verification Suite
 * Executes exhaustive end-to-end integration assertions against live
 * Express backend, PostgreSQL database, and Socket.IO real-time engine.
 */

import http from 'http';
import { io as ioClient } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const BACKEND_URL = 'http://localhost:5001';
let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ❌ CHECK FAILED: ${message}`);
    throw new Error(message);
  }
}

async function loginUser(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status}`);
  }
  const setCookie = res.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : '';
  const data = await res.json();
  return { cookie, user: data.user || data.data?.user };
}

async function runNotificationAudit() {
  console.log('================================================================');
  console.log('🔔 MEDIFLOW AI 2.0 — NOTIFICATION SYSTEM FINAL FEATURE TEST');
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: Service Health & Authentication Setup
  // ===========================================================================
  console.log('--- SECTION 1: Service Health & User Sessions ---');

  const healthRes = await fetch(`${BACKEND_URL}/api/health`);
  assert(healthRes.ok, 'Backend server responds healthy on port 5001');

  // Login as Patient, Doctor, and Admin
  const patient = await loginUser('rahul.verma@example.com', 'password123');
  assert(patient.user && patient.user.role === 'PATIENT', `Patient logged in: ${patient.user.name} (${patient.user.role})`);

  const doctor = await loginUser('dr.jawale@mediflow.com', 'password123');
  assert(doctor.user && doctor.user.role === 'DOCTOR', `Doctor logged in: ${doctor.user.name} (${doctor.user.role})`);

  const admin = await loginUser('admin@mediflow.com', 'password123');
  assert(admin.user && admin.user.role === 'ADMIN', `Admin logged in: ${admin.user.name} (${admin.user.role})`);

  // ===========================================================================
  // SECTION 2: Backend API & Security Verification
  // ===========================================================================
  console.log('\n--- SECTION 2: Notification API & Security Verification ---');

  // 2.1 Unauthenticated request rejected
  const unauthRes = await fetch(`${BACKEND_URL}/api/notifications`);
  assert(unauthRes.status === 401, 'Unauthenticated request strictly rejected with HTTP 401 Unauthorized');
  const unauthBody = await unauthRes.json();
  assert(unauthBody.success === false, 'Rejection payload includes { success: false }');

  // 2.2 Patient fetches notifications
  const patientNotifsRes = await fetch(`${BACKEND_URL}/api/notifications`, {
    headers: { Cookie: patient.cookie },
  });
  assert(patientNotifsRes.ok, 'Patient successfully retrieves personal notifications (HTTP 200)');
  const patientNotifs = await patientNotifsRes.json();
  assert(Array.isArray(patientNotifs.notifications), 'Notifications returned as an array');
  assert(typeof patientNotifs.unreadCount === 'number', `Current patient unread count: ${patientNotifs.unreadCount}`);

  // 2.3 Unread count badge endpoint
  const unreadCountRes = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
    headers: { Cookie: patient.cookie },
  });
  assert(unreadCountRes.ok, 'Fast unread count badge query succeeded (/api/notifications/unread-count)');
  const unreadData = await unreadCountRes.json();
  assert(typeof unreadData.unreadCount === 'number', `Unread count verified: ${unreadData.unreadCount}`);

  // 2.4 Invalid notification ID handling
  const invalidReadRes = await fetch(`${BACKEND_URL}/api/notifications/00000000-0000-0000-0000-000000000000/read`, {
    method: 'PATCH',
    headers: { Cookie: patient.cookie },
  });
  assert(invalidReadRes.status === 404, 'Invalid notification ID returns HTTP 404 Not Found');

  // ===========================================================================
  // SECTION 3: Socket.IO Real-Time Delivery & Isolation
  // ===========================================================================
  console.log('\n--- SECTION 3: Socket.IO Real-Time Delivery & Isolation ---');

  const patientSocket = ioClient(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  const doctorSocket = ioClient(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    patientSocket.on('connect', check);
    doctorSocket.on('connect', check);
  });
  assert(patientSocket.connected && doctorSocket.connected, 'Patient and Doctor Socket.IO clients connected successfully');

  // Patient joins their user room
  patientSocket.emit('join_user', { userId: patient.user.id, role: 'PATIENT' });
  doctorSocket.emit('join_user', { userId: doctor.user.id, role: 'DOCTOR' });

  // Set up event tracking for real-time push
  let patientReceivedNotification = null;
  let doctorReceivedNotification = null;

  patientSocket.on('notification:new', (notif) => {
    patientReceivedNotification = notif;
  });

  doctorSocket.on('notification:new', (notif) => {
    doctorReceivedNotification = notif;
  });

  // ===========================================================================
  // SECTION 4: Appointment Workflow Notification Integration
  // ===========================================================================
  console.log('\n--- SECTION 4: Appointment Workflow Notification Integration ---');

  // Ensure Doctor is PRESENT so slots can be booked
  const qrGatesRes = await fetch(`${BACKEND_URL}/api/presence/qr/active`, {
    headers: { Cookie: doctor.cookie },
  });
  assert(qrGatesRes.ok, 'Fetched active hospital QR gate for presence check-in');
  const qrGatesData = await qrGatesRes.json();
  const activeGate = (qrGatesData.qrCodes || qrGatesData.gates || [])[0];
  assert(activeGate && activeGate.code, `Active hospital gate located: ${activeGate?.location}`);

  // Check-in doctor
  const checkInRes = await fetch(`${BACKEND_URL}/api/presence/qr/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: doctor.cookie },
    body: JSON.stringify({
      token: activeGate.signedToken,
    }),
  });
  assert(checkInRes.ok || checkInRes.status === 409, 'Doctor checked in or already present');

  // Find target doctor record ID
  const docsRes = await fetch(`${BACKEND_URL}/api/doctors?search=Jawale`);
  const docsData = await docsRes.json();
  const targetDoc = (docsData.doctors || docsData.data || [])[0];
  assert(targetDoc && targetDoc.id, `Target clinician confirmed: Dr. ${targetDoc?.name || 'Sunil Jawale'}`);

  // Find next working date for target doctor
  const dayMap = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const workingDay = (targetDoc.availabilities || []).find((a) => a.isAvailable) || { dayOfWeek: 'MONDAY' };
  const targetDayIdx = dayMap[workingDay.dayOfWeek] ?? 1;
  const testDateObj = new Date();
  for (let i = 1; i <= 14; i++) {
    testDateObj.setDate(testDateObj.getDate() + 1);
    if (testDateObj.getDay() === targetDayIdx) break;
  }
  const yyyy = testDateObj.getFullYear();
  const mm = String(testDateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(testDateObj.getDate()).padStart(2, '0');
  const testDate = `${yyyy}-${mm}-${dd}`;

  // Fetch available slots
  const slotsRes = await fetch(`${BACKEND_URL}/api/appointments/slots/${targetDoc.id}?date=${testDate}`, {
    headers: { Cookie: patient.cookie },
  });
  assert(slotsRes.ok, 'Fetched open slots for appointment booking');
  const slotsData = await slotsRes.json();
  const availableSlots = slotsData.slots || slotsData.data?.slots || [];
  assert(availableSlots.length > 0, `Available consultation slots found on ${testDate}: ${availableSlots.length} slots`);
  const chosenSlot = availableSlots[0];

  // Reset tracking variables before booking
  patientReceivedNotification = null;
  doctorReceivedNotification = null;

  // Patient books appointment
  const bookRes = await fetch(`${BACKEND_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: patient.cookie },
    body: JSON.stringify({
      doctorId: targetDoc.id,
      date: testDate,
      startTime: chosenSlot.startTime,
      priority: 'MEDIUM',
      reason: 'Regular cardiac consultation evaluation',
    }),
  });
  assert(bookRes.ok, 'Patient booked consultation slot inside PostgreSQL transaction');
  const bookData = await bookRes.json();
  const appointment = bookData.data?.appointment || bookData.appointment;
  assert(appointment && appointment.appointmentNumber, `Appointment created: ${appointment.appointmentNumber}`);

  // Wait 300ms for Socket.IO event propagation
  await new Promise((r) => setTimeout(r, 400));

  // Verify real-time notification was received by Patient Socket
  assert(patientReceivedNotification !== null, 'Patient received real-time Socket.IO notification (notification:new)');
  assert(patientReceivedNotification?.type === 'APPOINTMENT_BOOKED', `Notification type: ${patientReceivedNotification?.type}`);
  assert(patientReceivedNotification?.title === 'Appointment Confirmed', `Patient Notification Title: ${patientReceivedNotification?.title}`);

  // Verify real-time notification was received by Doctor Socket
  assert(doctorReceivedNotification !== null, 'Doctor received real-time Socket.IO notification (notification:new)');
  assert(doctorReceivedNotification?.type === 'APPOINTMENT_BOOKED', `Doctor Notification type: ${doctorReceivedNotification?.type}`);
  assert(doctorReceivedNotification?.title === 'New Consultation Booked', `Doctor Notification Title: ${doctorReceivedNotification?.title}`);

  // Verify duplicate prevention: Attempt booking same slot again
  const duplicateBookRes = await fetch(`${BACKEND_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: patient.cookie },
    body: JSON.stringify({
      doctorId: targetDoc.id,
      date: testDate,
      startTime: chosenSlot.startTime,
      priority: 'MEDIUM',
    }),
  });
  assert(duplicateBookRes.status === 400 || duplicateBookRes.status === 409, 'Double-booking of same slot strictly blocked by database constraint');

  // ===========================================================================
  // SECTION 5: Doctor Presence Notification Integration (Check-In & Check-Out)
  // ===========================================================================
  console.log('\n--- SECTION 5: Doctor Presence Notifications (Admin & Doctor) ---');

  // Admin connects via Socket.IO
  const adminSocket = ioClient(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });
  await new Promise((resolve) => adminSocket.on('connect', resolve));
  adminSocket.emit('join_user', { userId: admin.user.id, role: 'ADMIN' });
  adminSocket.emit('join_role', 'admin');

  let adminReceivedNotification = null;
  adminSocket.on('notification:new', (notif) => {
    adminReceivedNotification = notif;
  });

  // 5.1 Doctor Check-Out
  adminReceivedNotification = null;
  const checkOutRes = await fetch(`${BACKEND_URL}/api/presence/qr/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: doctor.cookie },
  });
  assert(checkOutRes.ok, 'Doctor successfully checked out of hospital shift');

  await new Promise((r) => setTimeout(r, 400));
  assert(adminReceivedNotification !== null, 'Admin received real-time notification of Doctor Checkout');
  assert(adminReceivedNotification?.type === 'DOCTOR_CHECK_OUT', `Admin notification type: ${adminReceivedNotification?.type}`);
  assert(adminReceivedNotification?.title === 'Doctor Shift Completed', `Admin Notification Title: ${adminReceivedNotification?.title}`);

  // 5.2 Invalid Check-Out rejected (no duplicate notification)
  adminReceivedNotification = null;
  const invalidCheckoutRes = await fetch(`${BACKEND_URL}/api/presence/qr/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: doctor.cookie },
  });
  assert(invalidCheckoutRes.status === 404, 'Invalid checkout when not checked in rejected with HTTP 404');
  await new Promise((r) => setTimeout(r, 300));
  assert(adminReceivedNotification === null, 'No duplicate notification generated on failed check-out');

  // 5.3 Doctor Check-In
  adminReceivedNotification = null;
  const checkInAgainRes = await fetch(`${BACKEND_URL}/api/presence/qr/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: doctor.cookie },
    body: JSON.stringify({
      token: activeGate.signedToken,
    }),
  });
  assert(checkInAgainRes.ok, 'Doctor checked in to hospital shift');

  await new Promise((r) => setTimeout(r, 400));
  assert(adminReceivedNotification !== null, 'Admin received real-time notification of Doctor Check-In');
  assert(adminReceivedNotification?.type === 'DOCTOR_CHECK_IN', `Admin notification type: ${adminReceivedNotification?.type}`);
  assert(adminReceivedNotification?.title === 'Doctor Shift Check-In', `Admin Notification Title: ${adminReceivedNotification?.title}`);

  // 5.4 Duplicate Check-In rejected (no duplicate notification)
  adminReceivedNotification = null;
  const duplicateCheckInRes = await fetch(`${BACKEND_URL}/api/presence/qr/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: doctor.cookie },
    body: JSON.stringify({
      token: activeGate.signedToken,
    }),
  });
  assert(duplicateCheckInRes.status === 409, 'Duplicate check-in rejected with HTTP 409 Conflict');
  await new Promise((r) => setTimeout(r, 300));
  assert(adminReceivedNotification === null, 'No duplicate notification generated on failed 409 check-in');

  // ===========================================================================
  // SECTION 6: Read / Unread Status Management & Ownership Protection
  // ===========================================================================
  console.log('\n--- SECTION 6: Read/Unread State & Authorization Guards ---');

  // Patient queries updated notifications
  const patientUpdatedRes = await fetch(`${BACKEND_URL}/api/notifications`, {
    headers: { Cookie: patient.cookie },
  });
  const patientUpdatedData = await patientUpdatedRes.json();
  const unreadNotif = patientUpdatedData.notifications.find((n) => !n.isRead);
  assert(unreadNotif !== undefined, `Found unread notification: "${unreadNotif?.title}" (ID: ${unreadNotif?.id})`);

  // Security test: Doctor attempts to mark Patient's notification as read
  const unauthorizedMarkRes = await fetch(`${BACKEND_URL}/api/notifications/${unreadNotif.id}/read`, {
    method: 'PATCH',
    headers: { Cookie: doctor.cookie },
  });
  assert(unauthorizedMarkRes.status === 403, 'Cross-user modification blocked with HTTP 403 Forbidden');
  const unauthMarkBody = await unauthorizedMarkRes.json();
  assert(unauthMarkBody.success === false, 'Cross-user error response contains { success: false }');

  // Patient marks their own notification as read
  const markReadRes = await fetch(`${BACKEND_URL}/api/notifications/${unreadNotif.id}/read`, {
    method: 'PATCH',
    headers: { Cookie: patient.cookie },
  });
  assert(markReadRes.ok, 'Patient successfully marks their own notification as read (HTTP 200)');
  const markReadData = await markReadRes.json();
  assert(markReadData.notification.isRead === true, 'Notification state transitioned: isRead: true');

  // Patient marks all notifications as read
  const markAllRes = await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { Cookie: patient.cookie },
  });
  assert(markAllRes.ok, 'Mark all notifications as read succeeded (HTTP 200)');
  const markAllData = await markAllRes.json();
  assert(markAllData.unreadCount === 0, 'Unread count reset to 0');

  // Verify with unread-count endpoint
  const finalCountRes = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
    headers: { Cookie: patient.cookie },
  });
  const finalCountData = await finalCountRes.json();
  assert(finalCountData.unreadCount === 0, 'Unread count verified as 0 via /api/notifications/unread-count');

  // Clean up sockets
  patientSocket.disconnect();
  doctorSocket.disconnect();
  adminSocket.disconnect();

  console.log('\n================================================================');
  console.log(`🏆 ALL ${passedChecks} / ${totalChecks} NOTIFICATION INTEGRATION CHECKS PASSED 100%!`);
  console.log('================================================================\n');
}

runNotificationAudit().catch((err) => {
  console.error('\n❌ NOTIFICATION AUDIT FAILED:', err);
  process.exit(1);
});
