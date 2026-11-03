/**
 * Phase 10 Verification Suite:
 * - Appointment Rescheduling (Atomic, Conflict-free, Audit trail)
 * - Automatic Waitlist Slot Allocation Upon Reschedule & Cancellation
 * - Conflict Prevention (Double-booking rejection)
 * - Role-Based Authorization
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

async function runPhase10Tests() {
  console.log('=== STARTING PHASE 10 E2E AUTOMATED VERIFICATION ===\n');
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
    // 1. Health check
    const health = await request('/api/health');
    assert(health.statusCode === 200 && health.data?.success, 'Backend health check responds 200 OK');

    // 2. Register test patients
    const timestamp = Date.now();
    const patient1Email = `phase10.p1.${timestamp}@example.com`;
    const patient2Email = `phase10.p2.${timestamp}@example.com`;
    const patient3Email = `phase10.p3.${timestamp}@example.com`;

    const reg1 = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Phase 10 Patient One',
        email: patient1Email,
        password: 'Password@123',
        role: 'PATIENT',
        phone: '+91 9876543210',
        dateOfBirth: '1995-05-15',
        gender: 'MALE',
      },
    });
    const token1 = extractToken(reg1);
    assert(reg1.statusCode === 201 && token1, 'Register Patient 1 successfully and receive auth token');

    const reg2 = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Phase 10 Patient Two',
        email: patient2Email,
        password: 'Password@123',
        role: 'PATIENT',
        phone: '+91 9876543211',
        dateOfBirth: '1998-08-20',
        gender: 'FEMALE',
      },
    });
    const token2 = extractToken(reg2);
    assert(reg2.statusCode === 201 && token2, 'Register Patient 2 successfully and receive auth token');

    const reg3 = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Phase 10 Patient Three',
        email: patient3Email,
        password: 'Password@123',
        role: 'PATIENT',
        phone: '+91 9876543212',
        dateOfBirth: '1992-03-10',
        gender: 'MALE',
      },
    });
    const token3 = extractToken(reg3);
    assert(reg3.statusCode === 201 && token3, 'Register Patient 3 successfully and receive auth token');

    // 3. Get doctor list and pick Dr. Rajesh Sharma
    const docsRes = await request('/api/doctors');
    assert(docsRes.statusCode === 200 && docsRes.data?.doctors?.length > 0, 'Fetch doctors directory');
    const doctor = docsRes.data.doctors.find((d) => d.user?.email === 'dr.sharma@mediflow.com') || docsRes.data.doctors[0];
    console.log(`  Doctor selected: ${doctor.user?.name} (ID: ${doctor.id})`);

    // Ensure doctor is marked PRESENT
    const docLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'dr.sharma@mediflow.com', password: 'password123' },
    });
    const docToken = extractToken(docLogin);
    if (docToken) {
      await request('/api/presence/status', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${docToken}` },
        body: { status: 'PRESENT', notes: 'Phase 10 Verification Suite' },
      });
    }

    // 4. Find dates with available slots (using token1)
    function getNextMatchingDate(daysOffset = 1) {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split('T')[0];
    }

    let targetDate1 = null;
    let targetDate2 = null;
    let slotTime1 = null;
    let slotTime2 = null;
    let altSlotTimeOnDate2 = null;

    for (let offset = 1; offset <= 28; offset++) {
      const cand = getNextMatchingDate(offset);
      const slotsRes = await request(`/api/appointments/slots/${doctor.id}?date=${cand}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      const openSlots = slotsRes.data?.slots?.filter((s) => s.isAvailable !== false && s.status !== 'BOOKED') || [];
      if (openSlots.length >= 3) {
        if (!targetDate1) {
          targetDate1 = cand;
          slotTime1 = openSlots[0].startTime;
        } else if (!targetDate2 && cand !== targetDate1) {
          targetDate2 = cand;
          slotTime2 = openSlots[0].startTime;
          altSlotTimeOnDate2 = openSlots[1].startTime;
          break;
        }
      }
    }

    assert(targetDate1 && slotTime1, `Identified Target Date 1 (${targetDate1} at ${slotTime1})`);
    assert(targetDate2 && slotTime2, `Identified Target Date 2 (${targetDate2} at ${slotTime2})`);
    console.log(`  Target Date 2 Alternative Slot: ${altSlotTimeOnDate2}`);

    // 5. Patient 1 books an appointment on targetDate1 at slotTime1
    const bookRes = await request('/api/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        doctorId: doctor.id,
        date: targetDate1,
        startTime: slotTime1,
        priority: 'MEDIUM',
        reason: 'Initial consultation before rescheduling',
      },
    });

    assert(
      bookRes.statusCode === 201 && bookRes.data?.appointment?.id,
      `Patient 1 books appointment on ${targetDate1} at ${slotTime1}`,
      JSON.stringify(bookRes.data)
    );
    const appointment1 = bookRes.data?.appointment;

    // 6. Patient 2 joins the Waitlist for this doctor on targetDate1 at slotTime1
    const waitlistRes = await request('/api/waitlist', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        doctorId: doctor.id,
        preferredDate: targetDate1,
        preferredStartTime: slotTime1,
        medicalPriority: 'HIGH',
        clinicalUrgency: 'EMERGENCY',
        notes: 'Needs urgent slot if freed up',
      },
    });

    assert(
      waitlistRes.statusCode === 201 && waitlistRes.data?.waitlist?.id,
      `Patient 2 joins smart waitlist queue for ${targetDate1} (${slotTime1}) with EMERGENCY priority`,
      JSON.stringify(waitlistRes.data)
    );

    // 7. Patient 1 reschedules appointment to targetDate2 at slotTime2
    console.log('\n  --- Testing Reschedule Functionality ---');
    const rescheduleRes = await request(`/api/appointments/${appointment1.id}/reschedule`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        newDate: targetDate2,
        newStartTime: slotTime2,
        reason: 'Doctor conference conflict on previous date',
      },
    });

    assert(rescheduleRes.statusCode === 200, 'Reschedule endpoint returned 200 OK', JSON.stringify(rescheduleRes.data));
    assert(rescheduleRes.data?.appointment?.slot?.startTime === slotTime2, 'Appointment slot updated to new start time');
    assert(
      rescheduleRes.data?.appointment?.notes?.includes('Rescheduled from'),
      'Appointment notes record audit log of reschedule with reason'
    );
    assert(
      rescheduleRes.data?.autoAllocated === true,
      'Automatic waitlist slot allocation triggered on freed old slot during reschedule'
    );
    assert(
      !!rescheduleRes.data?.allocatedPatient,
      `Smart waitlist engine allocated freed slot to patient: ${rescheduleRes.data?.allocatedPatient?.name}`
    );

    // 8. Test Conflict Prevention: Patient 2 books altSlotTimeOnDate2, and Patient 1 tries to reschedule into it!
    console.log('\n  --- Testing Double-Booking Prevention on Reschedule ---');
    const p2Booking = await request('/api/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        doctorId: doctor.id,
        date: targetDate2,
        startTime: altSlotTimeOnDate2,
        priority: 'MEDIUM',
        reason: 'Regular consultation',
      },
    });
    assert(
      p2Booking.statusCode === 201,
      `Patient 2 books slot ${altSlotTimeOnDate2} on ${targetDate2}`,
      JSON.stringify(p2Booking.data)
    );

    // Now Patient 1 attempts to reschedule appointment1 into altSlotTimeOnDate2 (which Patient 2 just booked!)
    const conflictRes = await request(`/api/appointments/${appointment1.id}/reschedule`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        newDate: targetDate2,
        newStartTime: altSlotTimeOnDate2,
        reason: 'Attempting collision with Patient 2',
      },
    });

    assert(
      conflictRes.statusCode === 409,
      'Double-booking rejected with HTTP 409 Conflict when attempting to reschedule into an occupied slot'
    );

    // 9. Role-based Authorization: Patient 2 trying to reschedule Patient 1's appointment
    console.log('\n  --- Testing Role-Based Security ---');
    const unauthorizedRes = await request(`/api/appointments/${appointment1.id}/reschedule`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        newDate: targetDate2,
        newStartTime: '14:00',
        reason: 'Malicious attempt by unauthorized patient',
      },
    });
    assert(
      unauthorizedRes.statusCode === 403,
      'Unauthorized user rejected with HTTP 403 Forbidden when attempting to reschedule another patient appointment'
    );

    // 10. Test Automatic Waitlist Allocation on Direct Cancellation
    console.log('\n  --- Testing Automatic Allocation on Cancellation ---');
    // Patient 3 joins waitlist specifically for targetDate2 at slotTime2
    const waitlist3 = await request('/api/waitlist', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token3}` },
      body: {
        doctorId: doctor.id,
        preferredDate: targetDate2,
        preferredStartTime: slotTime2,
        medicalPriority: 'HIGH',
        clinicalUrgency: 'EMERGENCY',
        notes: 'Priority waitlist candidate for cancellation test',
      },
    });
    assert(waitlist3.statusCode === 201, 'Patient 3 joins waitlist for targetDate2 at slotTime2');

    // Patient 1 cancels appointment1 (which is currently occupying targetDate2 at slotTime2)
    const cancelRes = await request(`/api/appointments/${appointment1.id}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` },
    });

    assert(cancelRes.statusCode === 200, 'Appointment cancelled successfully');
    assert(
      cancelRes.data?.appointment?.autoAllocated === true,
      'Cancellation triggers automatic waitlist slot allocation'
    );
    assert(
      !!cancelRes.data?.appointment?.allocatedPatient,
      `Waitlist allocation assigned freed slot to patient: ${cancelRes.data?.appointment?.allocatedPatient?.name}`
    );

    console.log(`\n========================================`);
    console.log(`PHASE 10 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPhase10Tests();
