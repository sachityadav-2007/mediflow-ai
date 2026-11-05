// scratch/test_targeted_ui_improvements.mjs
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 MediFlow AI — Targeted UI/UX Improvements Verification');
  console.log('========================================================');
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

  // ---------------------------------------------------------------------------
  // 1. IMPROVEMENT 1: CLEANER NAVBAR
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Cleaner Navbar ---');
  const navbarCode = fs.readFileSync(path.resolve('frontend/src/components/Navbar.jsx'), 'utf8');

  assert(navbarCode.includes("to=\"/\"") && navbarCode.includes("navLinkClass('/')"), 'Home link accessible on desktop');
  assert(navbarCode.includes("to=\"/doctors\""), 'Specialists Directory accessible on desktop');
  assert(navbarCode.includes("to=\"/patient/dashboard\""), 'Dashboard accessible directly on desktop for Patient');
  assert(navbarCode.includes("to=\"/my-appointments\""), 'My Appointments accessible directly on desktop for Patient');
  assert(navbarCode.includes("moreDropdownOpen") && navbarCode.includes("setMoreDropdownOpen"), 'Clean More dropdown state implemented');
  assert(navbarCode.includes("to=\"/book\"") && navbarCode.includes("to=\"/waitlist\""), 'Book Slot and Smart Waitlist housed inside secondary navigation');
  assert(navbarCode.includes("handleOutsideClick") && navbarCode.includes("handleEscape"), 'Outside-click and Escape key listeners implemented for More dropdown');
  assert(navbarCode.includes("1800-200-FLOW") || navbarCode.includes("tel:18002003569"), 'Support helpline CTA visible and styled');

  // ---------------------------------------------------------------------------
  // 2. IMPROVEMENT 2: ENHANCE DOCTOR CARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Enhanced Doctor Cards ---');
  const doctorCardCode = fs.readFileSync(path.resolve('frontend/src/components/DoctorCard.jsx'), 'utf8');

  // Check availability status function
  assert(doctorCardCode.includes('renderAvailabilityBadge'), 'renderAvailabilityBadge helper implemented');
  assert(doctorCardCode.includes('🟢 Available'), '🟢 Available status label implemented for PRESENT / AVAILABLE');
  assert(doctorCardCode.includes('🟡 Limited Availability'), '🟡 Limited Availability status label implemented for IN_CONSULTATION / BUSY / AWAY');
  assert(doctorCardCode.includes('🔴 Currently Unavailable'), '🔴 Currently Unavailable status label implemented for OFFLINE');
  assert(doctorCardCode.includes('Availability information unavailable'), 'Neutral state "Availability information unavailable" implemented when data is missing');

  // Check next available slot text
  assert(doctorCardCode.includes('getNextSlotText'), 'getNextSlotText helper implemented to compute next authentic slot');
  assert(doctorCardCode.includes('Consult booking calendar'), 'Honest fallback when doctor has no scheduled availabilities');
  assert(doctorCardCode.includes('Verified Specialist') || doctorCardCode.includes('✓ Verified'), 'Verification status badge displayed');
  assert(doctorCardCode.includes('Book Appointment') && doctorCardCode.includes('to={`/book?doctorId=${doctor.id}`}'), 'Prominent Book Appointment CTA button preserved with link');

  // ---------------------------------------------------------------------------
  // 3. IMPROVEMENT 3: REMOVE TECHNICAL INFORMATION FROM PATIENT HOME PAGE
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing Patient Home Page & Technical Diagnostics Isolation ---');
  const homeCode = fs.readFileSync(path.resolve('frontend/src/pages/HomePage.jsx'), 'utf8');
  const adminCode = fs.readFileSync(path.resolve('frontend/src/pages/AdminDashboard.jsx'), 'utf8');

  // Check HomePage does not display technical diagnostics
  assert(!homeCode.includes('<ServerStatus'), 'ServerStatus technical component removed from patient HomePage');
  assert(!homeCode.includes('Capstone Technical Architecture'), 'Capstone Technical Architecture heading removed from patient HomePage');
  assert(!homeCode.includes('PostgreSQL + Prisma ORM (Port 5432)'), 'Raw technical port/database details removed from patient HomePage');

  // Check HomePage displays "Why Choose MediFlow AI?" with the 6 benefits
  assert(homeCode.includes('Why Choose MediFlow AI?'), 'Patient-focused "Why Choose MediFlow AI?" section added');
  assert(homeCode.includes('Smart Appointment Scheduling'), 'Benefit 1: Smart Appointment Scheduling present');
  assert(homeCode.includes('Live Doctor Availability'), 'Benefit 2: Live Doctor Availability present');
  assert(homeCode.includes('QR-Based Fast Check-In') || homeCode.includes('QR-Based Check-In'), 'Benefit 3: QR-Based Check-In present');
  assert(homeCode.includes('Real-Time Queue Updates'), 'Benefit 4: Real-Time Queue Updates present');
  assert(homeCode.includes('Smart Waitlist Management'), 'Benefit 5: Smart Waitlist Management present');
  assert(homeCode.includes('Reduced Waiting Time'), 'Benefit 6: Reduced Waiting Time present');

  // Check AdminDashboard preserves technical diagnostics
  assert(adminCode.includes('<ServerStatus />'), 'ServerStatus preserved in protected Admin Dashboard');
  assert(adminCode.includes('System Diagnostics & Production Architecture') || adminCode.includes('PostgreSQL + Prisma ORM'), 'Technical diagnostics panel preserved in Admin Dashboard');

  // ---------------------------------------------------------------------------
  // 4. IMPROVEMENT 4: FLOATING WIDGET RESPONSIVENESS
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing Floating Widget Responsiveness ---');
  const helperCode = fs.readFileSync(path.resolve('frontend/src/components/MediFlowHelperBubble.jsx'), 'utf8');

  assert(helperCode.includes('pointer-events-none') && helperCode.includes('pointer-events-auto'), 'Pointer events optimized so floating widget container does not block page clicks');
  assert(helperCode.includes('cardOpen') && helperCode.includes('setCardOpen'), 'Help card can be toggled and minimized');
  assert(helperCode.includes('max-w-[calc(100vw-2rem)]'), 'Responsive max-width prevents horizontal scrolling on mobile');
  assert(helperCode.includes('bottom-4 right-4 sm:bottom-6 sm:right-6'), 'Safe screen margins implemented for mobile, tablet, and desktop');
  assert(helperCode.includes('aria-label') && helperCode.includes('aria-expanded'), 'Accessibility attributes added to toggle button');

  // ---------------------------------------------------------------------------
  // 5. BACKEND API DOCTOR ROSTER VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Backend Doctor Roster & Availabilities ---');
  try {
    const res = await fetch('http://localhost:5001/api/doctors');
    const data = await res.json();
    assert(res.ok && data.success && Array.isArray(data.doctors), `GET /api/doctors returned ${data.doctors?.length} verified doctors`);
    const docWithAvail = data.doctors.find((d) => d.availabilities && d.availabilities.length > 0);
    assert(!!docWithAvail, `Doctor record contains authentic availabilities (e.g. ${docWithAvail?.user?.name} has ${docWithAvail?.availabilities?.length} scheduled slots)`);
  } catch (err) {
    assert(false, `Doctor API error: ${err.message}`);
  }

  console.log(`\n========================================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

