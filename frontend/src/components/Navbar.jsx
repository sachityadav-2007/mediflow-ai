import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
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

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand Logo & Sub-label (Apollo Inspired) */}
          <div className="flex items-center">
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0072CE] to-blue-500 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition">
                🏥
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl text-[#111827] tracking-tight leading-none group-hover:text-[#0072CE] transition">
                  MediFlow <span className="text-[#0072CE]">AI</span>
                </span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-0.5">
                  Apollo Specialist Network
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0072CE] px-2.5 py-1.5 rounded-lg transition"
            >
              Home
            </Link>
            <Link
              to="/doctors"
              className="text-xs sm:text-sm font-bold text-[#0072CE] bg-blue-50/60 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1.5"
            >
              <span>Doctors Directory</span>
              <span className="text-[10px] bg-[#0072CE] text-white px-1.5 py-0.2 rounded-full font-bold">109</span>
            </Link>

            {user?.role === 'PATIENT' && (
              <>
                <Link
                  to="/book"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0072CE] px-2.5 py-1.5 rounded-lg transition hidden md:block"
                >
                  Book Appointment
                </Link>
                <Link
                  to="/my-appointments"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0072CE] px-2.5 py-1.5 rounded-lg transition"
                >
                  My Appointments
                </Link>
                <Link
                  to="/waitlist"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0072CE] px-2.5 py-1.5 rounded-lg transition hidden sm:block"
                >
                  Smart Waitlist
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-purple-600 px-2 py-1.5 rounded-lg transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/doctors"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-purple-600 px-2 py-1.5 rounded-lg transition hidden lg:block"
                >
                  Doctors
                </Link>
                <Link
                  to="/admin/patients"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-purple-600 px-2 py-1.5 rounded-lg transition hidden lg:block"
                >
                  Patients
                </Link>
                <Link
                  to="/admin/attendance"
                  className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-purple-600 px-2 py-1.5 rounded-lg transition hidden md:block"
                >
                  Attendance &amp; QR
                </Link>
              </>
            )}

            {user?.role === 'DOCTOR' && (
              <Link
                to="/doctor/attendance"
                className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                <span>📷 My Attendance</span>
              </Link>
            )}

            {user && user.role !== 'ADMIN' && (
              <Link
                to={getDashboardPath(user.role)}
                className="text-xs sm:text-sm font-bold text-[#0072CE] hover:text-[#005ea2] px-3 py-1.5 rounded-lg bg-blue-50 transition"
              >
                Dashboard
              </Link>
            )}

            {user && (user.role === 'ADMIN' || user.role === 'DOCTOR') && (
              <Link
                to="/check-in"
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                <span>📲 OPD Check-In</span>
              </Link>
            )}

            {/* Helpline quick dial button (Apollo style) */}
            <a
              href="tel:1066"
              className="hidden xl:flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-400 hover:bg-amber-500 px-3 py-1.5 rounded-lg transition shadow-2xs"
              title="24/7 Apollo Emergency Helpline"
            >
              <span>📞 1066</span>
            </a>

            {/* Auth area */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-800 leading-tight">
                    {user.name}
                  </p>
                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 text-[#0072CE] uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 transition cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-medium text-gray-700 hover:text-[#0072CE] px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs sm:text-sm font-bold px-4 py-2 rounded-xl bg-[#0072CE] hover:bg-[#005ea2] text-white transition shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
