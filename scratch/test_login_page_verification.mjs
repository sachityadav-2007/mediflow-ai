// scratch/test_login_page_verification.mjs
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 MediFlow AI — Login Page & Authentication UI Verification');
  console.log('===========================================================');
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

  // 1. Inspect LoginPage.jsx content
  console.log('\n1. Verifying LoginPage.jsx UI Structure & Elements:');
  const loginPath = path.resolve('frontend/src/pages/LoginPage.jsx');
  const loginCode = fs.readFileSync(loginPath, 'utf8');

  // Accessible labels
  assert(loginCode.includes('htmlFor="email"') && loginCode.includes('id="email"'), 'Email label properly connected to input via htmlFor="email" & id="email"');
  assert(loginCode.includes('htmlFor="password"') && loginCode.includes('id="password"'), 'Password label properly connected to input via htmlFor="password" & id="password"');

  // Password visibility toggle
  assert(loginCode.includes('setShowPassword(!showPassword)') && loginCode.includes('type={showPassword ? \'text\' : \'password\'}'), 'Password show/hide toggle state and dynamic input type implemented');
  assert(loginCode.includes('type="button"') && loginCode.includes('aria-label={showPassword'), 'Password toggle button has type="button" and accessible aria-label');

  // Security header & Welcome Back
  assert(loginCode.includes('Welcome Back'), 'Header has "Welcome Back" clear title');
  assert(loginCode.includes('role-based access') || loginCode.includes('Role-Based Access Control'), 'Supporting text emphasizes secure role-based access');

  // Ambient healthcare background
  assert(loginCode.includes('bg-gradient') || loginCode.includes('bg-slate-50'), 'Subtle healthcare background styling applied');
  assert(loginCode.includes('radial-gradient(#0072CE') || loginCode.includes('blur-3xl'), 'Subtle ambient blurs / medical grid elements present');

  // 3 Role Cards
  assert(loginCode.includes('Administrator') && loginCode.includes('Manage hospital operations'), 'Role Card 1: Administrator with "Manage hospital operations" text');
  assert(loginCode.includes('Doctor') && (loginCode.includes('Manage appointments') || loginCode.includes('Manage appointments & patients')), 'Role Card 2: Doctor with "Manage appointments & patients" text');
  assert(loginCode.includes('Patient') && loginCode.includes('Book and track appointments'), 'Role Card 3: Patient with "Book and track appointments" text');

  // Demo auto-fill logic
  assert(loginCode.includes("handleQuickFill('admin@mediflow.com'") &&
         loginCode.includes("handleQuickFill('dr.sharma@mediflow.com'") &&
         loginCode.includes("handleQuickFill('rahul.verma@example.com'"), 'Demo role cards wired to fill authentic demo user credentials');

  // Form submit & loading state
  assert(loginCode.includes('isSubmitting') && loginCode.includes('Authenticating...'), 'Submit button has disabled state and shows "Authenticating..." spinner');
  assert(loginCode.includes('loginSuccess') && loginCode.includes('Access Granted'), 'Successful login transition state feedback present');

  // Error handling
  assert(loginCode.includes('role="alert"') && loginCode.includes('errorMessage'), 'Accessible error alert container with role="alert"');
  assert(loginCode.includes('ERR_NETWORK') || loginCode.includes('server is currently unreachable'), 'Server unavailable UX state handled distinctly from invalid credentials');

  // 2. Inspect Navbar.jsx
  console.log('\n2. Verifying Navbar.jsx Link States & Accessibility:');
  const navbarPath = path.resolve('frontend/src/components/Navbar.jsx');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');

  assert(navbarCode.includes("isActive('/login')") && navbarCode.includes('Sign In'), 'Navbar desktop Sign In has active state highlight');
  assert(navbarCode.includes('aria-current={isActive(\'/login\')'), 'Navbar Sign In link includes aria-current="page" when active');
  assert(navbarCode.includes('1800-200-FLOW') || navbarCode.includes('tel:18002003569'), 'Navbar contains 24/7 Support Helpline button');
  assert(navbarCode.includes('Specialists Directory'), 'Navbar contains Specialists Directory link');

  // 3. Test Backend Authentication API
  console.log('\n3. Testing Backend Authentication API Endpoints:');
  const baseUrl = 'http://localhost:5001';

  // Test Admin Login
  try {
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mediflow.com', password: 'password123' })
    });
    const adminData = await adminRes.json();
    assert(adminRes.ok && adminData.success && adminData.user.role === 'ADMIN', `Admin login successful (${adminData.user.name}, role: ${adminData.user.role})`);
  } catch (e) {
    assert(false, `Admin login failed: ${e.message}`);
  }

  // Test Doctor Login
  try {
    const docRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dr.sharma@mediflow.com', password: 'password123' })
    });
    const docData = await docRes.json();
    assert(docRes.ok && docData.success && docData.user.role === 'DOCTOR', `Doctor login successful (${docData.user.name}, role: ${docData.user.role})`);
  } catch (e) {
    assert(false, `Doctor login failed: ${e.message}`);
  }

  // Test Patient Login
  try {
    const patRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.com', password: 'password123' })
    });
    const patData = await patRes.json();
    assert(patRes.ok && patData.success && patData.user.role === 'PATIENT', `Patient login successful (${patData.user.name}, role: ${patData.user.role})`);
  } catch (e) {
    assert(false, `Patient login failed: ${e.message}`);
  }

  // Test Invalid Credentials Handling
  try {
    const badRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong.user@example.com', password: 'invalidpassword' })
    });
    const badData = await badRes.json();
    assert(badRes.status === 401 && badData.success === false, `Invalid credentials correctly rejected with HTTP 401: "${badData.message}"`);
  } catch (e) {
    assert(false, `Invalid login test error: ${e.message}`);
  }

  console.log(`\n===========================================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

