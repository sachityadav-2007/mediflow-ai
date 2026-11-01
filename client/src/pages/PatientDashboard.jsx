import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function PatientDashboard() {
  const { user, logout } = useAuth();
  const profile = user?.patientProfile;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-teal-500/30 border border-teal-300/30 rounded-full mb-2">
                🧑‍⚕️ Patient Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome, {user?.name || 'Patient'}!
              </h1>
              <p className="text-teal-100 text-sm mt-1">
                MediFlow AI Patient Dashboard &bull; Appointments &amp; Waitlist
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/book"
                className="self-start sm:self-auto px-4 py-2 bg-white text-teal-800 text-xs font-semibold rounded-lg shadow-sm hover:bg-teal-50 transition"
              >
                📅 Book Appointment
              </Link>
              <Link
                to="/my-appointments"
                className="self-start sm:self-auto px-4 py-2 bg-teal-600/80 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg border border-teal-400/40 transition"
              >
                📋 My Appointments
              </Link>
              <Link
                to="/doctors"
                className="self-start sm:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition"
              >
                🩺 Doctors
              </Link>
              <button
                onClick={logout}
                className="self-start sm:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Patient Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">🩸</span>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mt-2">Health Profile</h3>
            <p className="text-base font-bold text-gray-800 mt-1">
              Blood Group: {profile?.bloodGroup || 'Not specified'}
            </p>
            <p className="text-xs text-gray-500">Gender: {profile?.gender || 'Not specified'}</p>
            <p className="text-xs text-teal-600 font-semibold mt-1">
              Emergency: {profile?.emergencyContact || 'None added'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">📍</span>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mt-2">Contact Details</h3>
            <p className="text-base font-bold text-gray-800 mt-1">{user?.email}</p>
            <p className="text-xs text-gray-500">{user?.phone || 'No phone'}</p>
            <p className="text-xs text-gray-600 mt-1 truncate">
              {profile?.address || 'No address provided'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">📝</span>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mt-2">Medical History</h3>
            <p className="text-xs text-gray-700 mt-1 line-clamp-3">
              {profile?.medicalHistory || 'No previous medical history recorded.'}
            </p>
            <p className="text-xs text-green-600 font-semibold mt-2">Status: Active Patient</p>
          </div>
        </div>

        {/* Phase 3 Status Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-green-800">
          <h4 className="font-bold flex items-center gap-2 mb-1">
            <span>✅</span>
            <span>Phase 3 — Patient Authentication Verified</span>
          </h4>
          <p className="text-xs text-green-700">
            You are securely logged in as a patient. Priority-based appointment booking,
            doctor availability viewer, and automated waitlist allocation will be accessible in Phase 4.
          </p>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 3 Patient Portal
      </footer>
    </div>
  );
}

export default PatientDashboard;

