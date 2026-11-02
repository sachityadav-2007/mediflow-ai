import { Link } from 'react-router-dom';
import ServerStatus from '../components/ServerStatus';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10 flex-1">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg text-3xl mb-1">
            🏥
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
            MediFlow <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-800 font-semibold max-w-2xl mx-auto">
            Smart Hospital Appointment &amp; Doctor Availability Management System
          </p>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            A full-stack healthcare platform engineered with automated appointment scheduling,
            live doctor presence tracking, intelligent rule-based triage waitlist allocation,
            and real-time Socket.IO updates.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              to="/doctors"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              🩺 Browse Doctors Directory
            </Link>
            {user ? (
              <Link
                to={getDashboardPath(user.role)}
                className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-200 transition"
              >
                Go to {user.role.toLowerCase()} Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 shadow-sm transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
                >
                  Register Patient
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Server Connectivity Section */}
        <div>
          <ServerStatus />
        </div>

        {/* Key System Capabilities Grid */}
        <div>
          <h2 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
            Core System Architecture &amp; Capabilities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <span className="text-2xl mb-2 block">👨‍⚕️</span>
              <h3 className="font-bold text-gray-900 text-sm">Doctor Availability</h3>
              <p className="text-xs text-gray-500 mt-1">
                Live doctor presence tracking (Present, Busy, Away, Offline) and weekly schedule configuration.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <span className="text-2xl mb-2 block">📅</span>
              <h3 className="font-bold text-gray-900 text-sm">Dynamic Slot Engine</h3>
              <p className="text-xs text-gray-500 mt-1">
                Automatic generation of Discrete 30-min bookable appointment slots avoiding overlapping bookings.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <span className="text-2xl mb-2 block">⚡</span>
              <h3 className="font-bold text-gray-900 text-sm">Smart Waitlist Triage</h3>
              <p className="text-xs text-gray-500 mt-1">
                Transparent rule-based priority scoring (Medical Priority + Urgency + Wait Duration) with auto-allocation.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <span className="text-2xl mb-2 block">🔄</span>
              <h3 className="font-bold text-gray-900 text-sm">Real-Time Socket.IO</h3>
              <p className="text-xs text-gray-500 mt-1">
                Instant event-driven synchronization across patients, doctors, and hospital administrators.
              </p>
            </div>
          </div>
        </div>

        {/* Capstone Technical Verification Badge */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-blue-200 flex items-center gap-2">
                <span>🎓</span>
                <span>College Capstone Project — Production Architecture Verified</span>
              </p>
              <p className="text-gray-300 mt-1">
                Built with PostgreSQL, Prisma ORM, Express.js, React 18, Vite, Tailwind CSS, and Socket.IO.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span>All 8 Phases Complete</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-6 bg-white border-t border-gray-100">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System &bull; Capstone Project
      </footer>
    </div>
  );
}

export default HomePage;
