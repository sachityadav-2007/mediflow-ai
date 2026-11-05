import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target if redirected from a protected route
  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      setLoginSuccess(true);

      // Brief transition delay so user sees confirmed authentication state
      setTimeout(() => {
        if (from) {
          navigate(from, { replace: true });
        } else if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'DOCTOR') {
          navigate('/doctor/dashboard', { replace: true });
        } else {
          navigate('/patient/dashboard', { replace: true });
        }
      }, 350);
    } catch (err) {
      // Differentiate between network/server-down errors and invalid credentials
      if (err.code === 'ERR_NETWORK' || (!err.response && err.message?.includes('Network'))) {
        setErrorMessage(
          'MediFlow hospital server is currently unreachable. Please ensure the backend service on port 5001 is active.'
        );
      } else {
        setErrorMessage(
          err.response?.data?.message || err.message || 'Invalid credentials. Please verify your email and password.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill helper for college viva demonstration
  const handleQuickFill = (demoEmail, demoPassword, role) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setActiveDemoRole(role);
    setErrorMessage('');
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    setActiveDemoRole(null);
    if (errorMessage) setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col justify-between overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background: Subtle healthcare ambient gradient with soft blur shapes and dot matrix */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft cyan/blue ambient orb */}
        <div className="absolute -top-32 -left-32 w-80 sm:w-96 h-80 sm:h-96 bg-blue-100/70 rounded-full blur-3xl opacity-80" />
        {/* Soft sky/indigo ambient orb */}
        <div className="absolute -bottom-32 -right-32 w-80 sm:w-96 h-80 sm:h-96 bg-sky-100/60 rounded-full blur-3xl opacity-80" />
        {/* Subtle hospital grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(#0072CE 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md sm:max-w-lg">
          {/* Header Branding & Security Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 shadow-xs mb-3 group">
              <svg
                className="w-7 h-7 text-[#0072CE] transition-transform duration-200 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
              Secure role-based access to the MediFlow AI clinical scheduling and patient management network.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-sm py-7 px-5 sm:py-9 sm:px-10 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/90 transition-all">
            {/* Error or Alert Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <svg
                  className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-rose-900">Authentication Error</p>
                  <p className="mt-0.5 text-rose-700 text-xs leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success State Notification */}
            {loginSuccess && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200"
              >
                <svg
                  className="w-5 h-5 text-emerald-600 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900">Access Granted</p>
                  <p className="text-emerald-700 text-xs">Redirecting to your dashboard...</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isSubmitting || loginSuccess}
                    value={email}
                    onChange={handleInputChange(setEmail)}
                    placeholder="name@hospital.com"
                    aria-invalid={!!errorMessage}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] transition disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Min. 6 characters</span>
                </div>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    disabled={isSubmitting || loginSuccess}
                    value={password}
                    onChange={handleInputChange(setPassword)}
                    placeholder="Enter your password"
                    aria-invalid={!!errorMessage}
                    className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] transition disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  {/* Accessible Password Visibility Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-[#0072CE] cursor-pointer"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loginSuccess}
                className="w-full mt-2 py-3 px-4 bg-[#0072CE] hover:bg-[#005fa8] active:bg-[#004f8c] disabled:bg-[#0072CE]/60 text-white font-bold text-sm rounded-xl shadow-xs hover:shadow transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40 focus:ring-offset-1"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : loginSuccess ? (
                  <>
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Access Granted</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts Section */}
            <div className="mt-7 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Quick Demo Accounts
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Click role to auto-fill</span>
              </div>

              {/* 3 Clean Role Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Administrator */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@mediflow.com', 'password123', 'ADMIN')}
                  className={`p-3 rounded-xl border text-left transition duration-150 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40 ${
                    activeDemoRole === 'ADMIN'
                      ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300 shadow-2xs'
                      : 'bg-slate-50/70 hover:bg-purple-50/50 border-slate-200/90 hover:border-purple-200'
                  }`}
                  aria-label="Fill Administrator demo credentials"
                >
                  <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
                        Administrator
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Manage hospital operations
                      </p>
                    </div>
                  </div>
                </button>

                {/* 2. Doctor */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('dr.sharma@mediflow.com', 'password123', 'DOCTOR')}
                  className={`p-3 rounded-xl border text-left transition duration-150 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40 ${
                    activeDemoRole === 'DOCTOR'
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300 shadow-2xs'
                      : 'bg-slate-50/70 hover:bg-blue-50/50 border-slate-200/90 hover:border-blue-200'
                  }`}
                  aria-label="Fill Doctor demo credentials"
                >
                  <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0072CE] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-[#0072CE] transition">
                        Doctor
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Manage appointments &amp; patients
                      </p>
                    </div>
                  </div>
                </button>

                {/* 3. Patient */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('rahul.verma@example.com', 'password123', 'PATIENT')}
                  className={`p-3 rounded-xl border text-left transition duration-150 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40 ${
                    activeDemoRole === 'PATIENT'
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs'
                      : 'bg-slate-50/70 hover:bg-emerald-50/50 border-slate-200/90 hover:border-emerald-200'
                  }`}
                  aria-label="Fill Patient demo credentials"
                >
                  <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        Patient
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Book and track appointments
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Registration Link Callout */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                New to the MediFlow hospital network?{' '}
                <Link
                  to="/register"
                  className="font-bold text-[#0072CE] hover:text-[#005fa8] hover:underline transition"
                >
                  Create an Account
                </Link>
              </p>
            </div>
          </div>

          {/* Security & Compliance Footer Note */}
          <div className="mt-6 text-center space-y-1">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Protected by Role-Based Access Control (RBAC) &amp; 256-bit Session Encryption</span>
            </p>
          </div>
        </div>
      </main>

      {/* Hospital System Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50 backdrop-blur-xs">
        MediFlow AI &copy; Smart Hospital Appointment, Doctor Availability &amp; Queue Management System
      </footer>
    </div>
  );
}

export default LoginPage;
