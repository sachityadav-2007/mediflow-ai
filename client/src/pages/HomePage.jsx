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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-2 shadow-inner text-3xl">
            🏥
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            MediFlow AI
          </h1>
          <p className="text-xl text-blue-700 font-medium">
            Smart Hospital Appointment &amp; Doctor Availability System
          </p>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            A full-stack healthcare platform designed to optimize appointment allocation,
            manage doctor presence, and streamline patient waitlists.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/doctors"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition"
            >
              🩺 Browse Doctors Directory
            </Link>
            {user ? (
              <Link
                to={getDashboardPath(user.role)}
                className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm rounded-xl border border-indigo-200 transition"
              >
                Go to {user.role.toLowerCase()} Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 shadow-sm transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 shadow-sm transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Server Connectivity Section */}
        <div>
          <ServerStatus />
        </div>

        {/* Project Phases Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* Phase 2: Database */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Phase 2 — PostgreSQL &amp; Prisma ORM
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span>
                <span>PostgreSQL database connected (mediflow_ai)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span>
                <span>7 Core models &amp; 8 enums verified</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span>
                <span>Prisma migration &amp; seed script executed</span>
              </li>
            </ul>
          </div>

          {/* Phase 3: Authentication */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 bg-blue-50/20">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
              Phase 3 — Authentication &amp; RBAC
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span>
                <span>JWT Authentication via HTTP-only cookies</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span>
                <span>Bcrypt password hashing (salt rounds: 10)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-500 font-bold">✓</span>
                <span>Role-based routing (Admin, Doctor, Patient)</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-6">
        MediFlow AI &copy; Capstone Project &bull; Built with React, Vite, Node.js &amp; Express
      </footer>
    </div>
  );
}

export default HomePage;
