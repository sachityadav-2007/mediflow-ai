import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Badge from './ui/Badge';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const getDashboardPath = (role) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'PATIENT':
        return '/patient/dashboard';
      default:
        return '/';
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const isMoreActive = (role) => {
    if (role === 'PATIENT') return isActive('/book') || isActive('/waitlist') || isActive('/find-specialist') || isActive('/health-assistant');
    if (role === 'DOCTOR') return isActive('/check-in');
    if (role === 'ADMIN') return isActive('/admin/intelligence') || isActive('/check-in');
    return false;
  };

  const navLinkClass = (path) =>
    `text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 ${
      isActive(path)
        ? 'text-[#0072CE] bg-blue-50/80 font-bold border border-blue-200/60'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`;

  const mobileNavLinkClass = (path) =>
    `text-sm font-semibold px-4 py-3 rounded-xl transition flex items-center justify-between ${
      isActive(path)
        ? 'text-[#0072CE] bg-blue-50 font-bold border border-blue-200/80'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0072CE] to-blue-500 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition duration-200">
                🏥
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl text-slate-900 tracking-tight leading-none group-hover:text-[#0072CE] transition">
                  MediFlow <span className="text-[#0072CE]">AI</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                  Smart Hospital Network
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Link to="/" className={navLinkClass('/')}>
              Home
            </Link>
            <Link to="/doctors" className={navLinkClass('/doctors')}>
              <span>Specialists Directory</span>
            </Link>

            {/* Role-Specific Desktop Links */}
            {user?.role === 'PATIENT' && (
              <>
                <Link to="/patient/dashboard" className={navLinkClass('/patient/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/health-assistant" className={navLinkClass('/health-assistant')}>
                  Health Assistant
                </Link>
                <Link to="/my-appointments" className={navLinkClass('/my-appointments')}>
                  My Appointments
                </Link>
              </>
            )}

            {user?.role === 'DOCTOR' && (
              <>
                <Link to="/doctor/dashboard" className={navLinkClass('/doctor/dashboard')}>
                  Doctor Dashboard
                </Link>
                <Link to="/doctor/attendance" className={navLinkClass('/doctor/attendance')}>
                  📷 My Attendance
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')}>
                  Overview
                </Link>
                <Link to="/admin/doctors" className={navLinkClass('/admin/doctors')}>
                  Doctors
                </Link>
                <Link to="/admin/patients" className={navLinkClass('/admin/patients')}>
                  Patients
                </Link>
                <Link to="/admin/appointments" className={navLinkClass('/admin/appointments')}>
                  Appointments
                </Link>
              </>
            )}

            {/* Clean Secondary Navigation: "More" Dropdown */}
            {user && (
              <div className="relative" ref={moreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen((prev) => !prev)}
                  className={`text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                    isMoreActive(user.role)
                      ? 'text-[#0072CE] bg-blue-50/80 font-bold border border-blue-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  aria-expanded={moreDropdownOpen}
                  aria-haspopup="true"
                >
                  <span>More</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${moreDropdownOpen ? 'rotate-180 text-[#0072CE]' : 'text-slate-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {moreDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {user.role === 'PATIENT' && (
                      <>
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Patient Services
                        </div>
                        <Link
                          to="/health-assistant"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition ${
                            isActive('/health-assistant') || isActive('/find-specialist')
                              ? 'text-[#0072CE] bg-blue-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">🧭</span>
                          <span>Health Assistant</span>
                        </Link>
                        <Link
                          to="/book"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition ${
                            isActive('/book')
                              ? 'text-[#0072CE] bg-blue-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">📅</span>
                          <span>Book Slot</span>
                        </Link>
                        <Link
                          to="/waitlist"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition ${
                            isActive('/waitlist')
                              ? 'text-[#0072CE] bg-blue-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">⏳</span>
                          <span>Smart Waitlist</span>
                        </Link>
                      </>
                    )}

                    {user.role === 'DOCTOR' && (
                      <>
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Clinical Tools
                        </div>
                        <Link
                          to="/check-in"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition ${
                            isActive('/check-in')
                              ? 'text-[#0072CE] bg-blue-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">📲</span>
                          <span>OPD Check-In Scanner</span>
                        </Link>
                      </>
                    )}

                    {user.role === 'ADMIN' && (
                      <>
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Hospital Operations
                        </div>
                        <Link
                          to="/admin/intelligence"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition ${
                            isActive('/admin/intelligence')
                              ? 'text-[#0072CE] bg-blue-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">⚡</span>
                          <span>AI Intelligence Center</span>
                        </Link>
                        <Link
                          to="/check-in"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition ${
                            isActive('/check-in')
                              ? 'text-[#0072CE] bg-blue-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">📲</span>
                          <span>OPD Reception Scanner</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Right Action Area */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Helpline Pill */}
            <a
              href="tel:18002003569"
              className="flex items-center gap-1.5 text-xs font-bold text-[#0072CE] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 px-3 py-1.5 rounded-xl transition duration-150"
              title="24/7 MediFlow Emergency & Outpatient Helpline"
            >
              <span>📞</span>
              <span>1800-200-FLOW</span>
            </a>

            {/* User Profile / Auth State */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <Link
                  to={getDashboardPath(user.role)}
                  className="flex items-center gap-2 group p-1 rounded-xl hover:bg-slate-50 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-[#0072CE] transition max-w-[120px] truncate">
                      {user.name}
                    </p>
                    <Badge
                      variant={
                        user.role === 'ADMIN'
                          ? 'purple'
                          : user.role === 'DOCTOR'
                          ? 'success'
                          : 'primary'
                      }
                      size="xs"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                  aria-label="Log out of application"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition duration-150 ${
                    isActive('/login')
                      ? 'text-[#0072CE] bg-blue-50/80 font-bold border border-blue-200/80 shadow-2xs'
                      : 'text-slate-700 hover:text-[#0072CE] hover:bg-slate-50'
                  }`}
                  aria-current={isActive('/login') ? 'page' : undefined}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition shadow-xs ${
                    isActive('/register')
                      ? 'bg-[#005fa8] text-white ring-2 ring-blue-300'
                      : 'bg-[#0072CE] hover:bg-[#005fa8] text-white'
                  }`}
                  aria-current={isActive('/register') ? 'page' : undefined}
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 lg:hidden">
            {user && (
              <Link to={getDashboardPath(user.role)} className="shrink-0">
                <Badge
                  variant={
                    user.role === 'ADMIN'
                      ? 'purple'
                      : user.role === 'DOCTOR'
                      ? 'success'
                      : 'primary'
                  }
                  size="xs"
                >
                  {user.role}
                </Badge>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40 cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass('/')}
            >
              <span>🏠 Home</span>
            </Link>
            <Link
              to="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass('/doctors')}
            >
              <span>🩺 Specialists Directory</span>
            </Link>

            {/* Patient Mobile Navigation */}
            {user?.role === 'PATIENT' && (
              <>
                <Link
                  to="/patient/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/patient/dashboard')}
                >
                  <span>📊 Patient Dashboard</span>
                </Link>
                <Link
                  to="/health-assistant"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/health-assistant')}
                >
                  <span>🧭 Health Assistant</span>
                </Link>
                <Link
                  to="/book"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/book')}
                >
                  <span>📅 Book Appointment</span>
                </Link>
                <Link
                  to="/my-appointments"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/my-appointments')}
                >
                  <span>📋 My Appointments</span>
                </Link>
                <Link
                  to="/waitlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/waitlist')}
                >
                  <span>⏳ Smart Waitlist</span>
                </Link>
              </>
            )}

            {/* Doctor Mobile Navigation */}
            {user?.role === 'DOCTOR' && (
              <>
                <Link
                  to="/doctor/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/doctor/dashboard')}
                >
                  <span>👨‍⚕️ Doctor Dashboard</span>
                </Link>
                <Link
                  to="/doctor/attendance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/doctor/attendance')}
                >
                  <span>📷 My Attendance &amp; Shift</span>
                </Link>
                <Link
                  to="/check-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/check-in')}
                >
                  <span>📲 Reception OPD Check-In</span>
                </Link>
              </>
            )}

            {/* Admin Mobile Navigation */}
            {user?.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/admin/dashboard')}
                >
                  <span>📊 Executive Overview</span>
                </Link>
                <Link
                  to="/admin/doctors"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/admin/doctors')}
                >
                  <span>👨‍⚕️ Doctor Rosters</span>
                </Link>
                <Link
                  to="/admin/patients"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/admin/patients')}
                >
                  <span>🧑‍🤝‍🧑 Patients Directory</span>
                </Link>
                <Link
                  to="/admin/appointments"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/admin/appointments')}
                >
                  <span>📅 Appointment Audit</span>
                </Link>
                <Link
                  to="/admin/intelligence"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/admin/intelligence')}
                >
                  <span>⚡ AI Intelligence Center</span>
                </Link>
                <Link
                  to="/check-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass('/check-in')}
                >
                  <span>📲 OPD Reception Scanner</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Footer & Auth */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <a
              href="tel:18002003569"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 text-[#0072CE] font-bold text-xs"
            >
              <span>📞 Helpline: 1800-200-FLOW</span>
            </a>

            {user ? (
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Badge variant="neutral" size="xs">
                    {user.role}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full py-2.5 text-center text-xs font-bold rounded-xl transition ${
                    isActive('/login')
                      ? 'text-[#0072CE] bg-blue-50 border border-blue-200/80 shadow-2xs'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                  }`}
                  aria-current={isActive('/login') ? 'page' : undefined}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full py-2.5 text-center text-xs font-bold rounded-xl transition ${
                    isActive('/register')
                      ? 'bg-[#005fa8] text-white shadow-inner'
                      : 'text-white bg-[#0072CE] hover:bg-[#005fa8]'
                  }`}
                  aria-current={isActive('/register') ? 'page' : undefined}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
