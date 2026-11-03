import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getPatientAppointments,
  getMyWaitlist,
  getSmartSlotRecommendations,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';

function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profile = user?.patientProfile;

  const [appointments, setAppointments] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [aptRes, wlRes, recRes] = await Promise.all([
        getPatientAppointments().catch(() => ({ appointments: [] })),
        getMyWaitlist().catch(() => ({ waitlist: [] })),
        getSmartSlotRecommendations({ limit: 4 }).catch(() => ({ recommendations: [] })),
      ]);

      if (aptRes?.appointments) {
        setAppointments(aptRes.appointments);
      }
      if (wlRes?.waitlist) {
        setWaitlistEntries(wlRes.waitlist);
      }
      if (recRes?.recommendations) {
        setRecommendedSlots(recRes.recommendations);
      }
    } catch (err) {
      console.error('Failed to load patient dashboard records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time socket updates for patient appointments, waitlist and AI updates
  useSocket('appointment_created', fetchDashboardData);
  useSocket('appointment_cancelled', fetchDashboardData);
  useSocket('appointment_allocated', fetchDashboardData);
  useSocket('waitlist_updated', fetchDashboardData);
  useSocket('ai_forecast_updated', fetchDashboardData);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
  );

  const activeWaitlists = waitlistEntries.filter((w) => w.status === 'PENDING');

  const getStatusBadge = (status) => {
    const map = {
      SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
      CONFIRMED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      ALLOCATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
          map[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-bold bg-teal-500/30 border border-teal-300/30 rounded-full mb-2">
                🧑‍⚕️ Patient Care Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back, {user?.name || 'Patient'}!
              </h1>
              <p className="text-teal-100 text-sm mt-1">
                MediFlow AI &bull; Smart Scheduling, Availability &amp; Priority Triage
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/book"
                className="px-4 py-2 bg-white text-teal-800 text-xs font-bold rounded-lg shadow-sm hover:bg-teal-50 transition"
              >
                📅 Book Appointment
              </Link>
              <Link
                to="/waitlist"
                className="px-4 py-2 bg-teal-500/30 hover:bg-teal-500/50 text-white text-xs font-semibold rounded-lg border border-teal-300/30 transition"
              >
                ⏳ Smart Waitlist
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Link
            to="/book"
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-teal-500 hover:shadow-md transition group"
          >
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition text-sm">
              Book Appointment
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select doctor and available slot
            </p>
          </Link>

          <Link
            to="/my-appointments"
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-teal-500 hover:shadow-md transition group"
          >
            <div className="text-3xl mb-3">📋</div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition text-sm">
                My Appointments
              </h3>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {upcomingAppointments.length} upcoming
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              View confirmed &amp; scheduled visits
            </p>
          </Link>

          <Link
            to="/waitlist"
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-teal-500 hover:shadow-md transition group"
          >
            <div className="text-3xl mb-3">⏳</div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition text-sm">
                Smart Waitlist
              </h3>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {activeWaitlists.length} active
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              AI-inspired priority triage queue
            </p>
          </Link>

          <Link
            to="/doctors"
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-teal-500 hover:shadow-md transition group"
          >
            <div className="text-3xl mb-3">🩺</div>
            <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition text-sm">
              Doctor Directory
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Check live status &amp; specialties
            </p>
          </Link>
        </div>

        {/* Patient Profile & Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">🩸</span>
            <h3 className="text-xs font-bold text-gray-400 uppercase mt-2">Health Profile</h3>
            <p className="text-base font-bold text-gray-800 mt-1">
              Blood Group: {profile?.bloodGroup || 'Not specified'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Gender: {profile?.gender || 'Not specified'}</p>
            <p className="text-xs text-teal-600 font-semibold mt-2">
              Emergency: {profile?.emergencyContact || 'None added'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">📍</span>
            <h3 className="text-xs font-bold text-gray-400 uppercase mt-2">Contact Details</h3>
            <p className="text-base font-bold text-gray-800 mt-1 truncate">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-0.5">Phone: {user?.phone || 'No phone'}</p>
            <p className="text-xs text-gray-600 mt-2 truncate">
              {profile?.address || 'No address provided'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">📝</span>
            <h3 className="text-xs font-bold text-gray-400 uppercase mt-2">Medical History</h3>
            <p className="text-xs text-gray-700 mt-1 line-clamp-3">
              {profile?.medicalHistory || 'No previous medical history recorded.'}
            </p>
            <p className="text-xs text-green-600 font-semibold mt-2">Status: Active Patient Profile</p>
          </div>
        </div>

        {/* Phase 10: Smart AI Slot Recommendations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Smart AI Appointment Recommendations
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  AI Ranked
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optimized open slots with highest doctor presence probability, minimal queue wait times, and off-peak comfort.
              </p>
            </div>
            <Link
              to="/book"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition flex items-center gap-1"
            >
              Browse All Slots ➔
            </Link>
          </div>

          {recommendedSlots.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Analyzing doctor availability &amp; queue velocity patterns...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedSlots.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-b from-white to-teal-50/20 border border-gray-200 hover:border-teal-400 rounded-xl p-4 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                        ⭐ AI Score: {rec.aiScore}/100
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {Math.round(rec.availabilityProbability * 100)}% Certainty
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{rec.doctorName}</h3>
                      <p className="text-xs text-teal-700 font-medium">
                        {rec.specialization} &bull; {rec.department}
                      </p>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1 text-gray-600">
                      <div>
                        📅 <strong>{rec.date}</strong> ({rec.dayOfWeek.slice(0, 3)})
                      </div>
                      <div>
                        ⏰ <strong>{rec.startTime} &ndash; {rec.endTime}</strong>
                      </div>
                      <div className="text-[11px] text-amber-800">
                        ⏳ Est. Wait: <strong>~{rec.estimatedWaitMinutes} mins</strong> (Pos #{rec.queuePosition})
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 leading-snug italic">
                      "{rec.recommendationReason}"
                    </p>
                  </div>

                  <Link
                    to={`/book?doctorId=${rec.doctorId}&date=${rec.date}`}
                    className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold text-center shadow-2xs transition block"
                  >
                    Select This Slot ➔
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Overview Sections: Upcoming Appointments & Active Waitlists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>📅</span>
                  <span>Upcoming Appointments</span>
                </h2>
                <p className="text-xs text-gray-500">Your scheduled doctor consultations</p>
              </div>
              <Link
                to="/my-appointments"
                className="text-xs font-semibold text-teal-600 hover:text-teal-800"
              >
                View All &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading appointments...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6">
                <p className="text-sm font-semibold text-gray-700">No upcoming appointments</p>
                <p className="text-xs text-gray-400 mt-1">Book an appointment with a specialist today.</p>
                <Link
                  to="/book"
                  className="mt-3 inline-block px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition"
                >
                  Book Now
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {apt.doctor?.user?.name || 'Doctor'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {apt.doctor?.specialization} &bull; {new Date(apt.appointmentDate).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-teal-700 font-mono mt-0.5">
                        {apt.slot?.startTime} - {apt.slot?.endTime}
                      </p>
                    </div>
                    <div>{getStatusBadge(apt.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Waitlist Queue */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>⏳</span>
                  <span>Active Waitlist Standby</span>
                </h2>
                <p className="text-xs text-gray-500">Smart queue monitoring for cancellations</p>
              </div>
              <Link
                to="/waitlist"
                className="text-xs font-semibold text-teal-600 hover:text-teal-800"
              >
                View Details &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading waitlist...</div>
            ) : activeWaitlists.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6">
                <p className="text-sm font-semibold text-gray-700">Not on any waitlist</p>
                <p className="text-xs text-gray-400 mt-1">
                  If slots for your preferred doctor are full, join the waitlist for smart automated allocation.
                </p>
                <Link
                  to="/waitlist"
                  className="mt-3 inline-block px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition"
                >
                  Join Waitlist
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeWaitlists.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {w.doctor?.user?.name || 'Doctor'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {w.doctor?.specialization} &bull; Preferred:{' '}
                        {new Date(w.preferredDate).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                        Priority Score: {w.priorityScore} pts
                      </p>
                    </div>
                    <div>{getStatusBadge(w.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 bg-white border-t border-gray-100">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System
      </footer>
    </div>
  );
}

export default PatientDashboard;
