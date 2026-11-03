import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ServerStatus from '../components/ServerStatus';
import DoctorCard from '../components/DoctorCard';
import CallNowModal from '../components/CallNowModal';
import MediFlowHelperBubble from '../components/MediFlowHelperBubble';
import { getDoctors } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Doctor roster states
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('Pune');
  const [callModalDoctor, setCallModalDoctor] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showArchDetails, setShowArchDetails] = useState(false);

  // Fetch doctors from backend
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await getDoctors();
      if (res && res.success) {
        setDoctors(res.doctors || []);
      }
    } catch {
      // Backend may be booting up
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Real-time Socket.IO presence updates
  useSocket('doctor_status_changed', (data) => {
    if (data?.doctorId) {
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === data.doctorId
            ? { ...doc, currentPresence: data.presenceStatus }
            : doc
        )
      );
    }
  });

  // Filtered doctors for home preview (top specialists)
  const displayedDoctors = useMemo(() => {
    let list = doctors;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.user?.name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.department?.toLowerCase().includes(q)
      );
    }
    if (selectedSpeciality !== 'ALL') {
      list = list.filter((d) => d.specialization === selectedSpeciality);
    }
    return list;
  }, [doctors, searchQuery, selectedSpeciality]);

  // Handle Search Submission -> route to full directory
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/doctors?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/doctors');
    }
  };

  // Share link copy
  const handleShare = (doc) => {
    const shareUrl = `${window.location.origin}/book?doctorId=${doc.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setToastMessage(`✓ Link copied for ${doc.user?.name || doc.name}`);
      setTimeout(() => setToastMessage(''), 3000);
    }
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

  const quickSpecialities = [
    { label: 'Urology', icon: '🩺' },
    { label: 'Cardiac Sciences', icon: '❤️' },
    { label: 'Orthopedics', icon: '🦴' },
    { label: 'Nephrology', icon: '🧪' },
    { label: 'Oncology', icon: '🎗️' },
    { label: 'Neurosciences', icon: '🧠' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between relative text-gray-800">
      <Navbar />

      {/* Copy Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-gray-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Hospital Top Announcement Strip */}
      <div className="bg-[#0072CE] text-white text-xs py-2 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>MediFlow AI Smart Hospital Network &bull; Live OPD Queue &amp; Doctor Attendance Active</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <a href="tel:18002003569" className="hover:underline flex items-center gap-1">
              📞 24/7 Helpline: 1800-200-FLOW
            </a>
            <span className="text-white/40">|</span>
            <span className="flex items-center gap-1">
              📍 Central Hospital Campus, Pune
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12 flex-1">
        {/* ============================================================= */}
        {/* HERO SECTION: Doctor Search & Booking                         */}
        {/* ============================================================= */}
        <section className="bg-gradient-to-br from-white via-blue-50/40 to-white rounded-3xl p-6 sm:p-10 border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0072CE] text-xs font-bold">
              <span>🏥</span>
              <span>Intelligent Outpatient Management System</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-[#111827] tracking-tight leading-tight">
              Best Specialists In {selectedCity === 'ALL' ? 'MediFlow Network' : selectedCity}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed">
              Book instant appointments with verified consultants across MediFlow AI Central Hospital.
              Live clinic presence tracking, dynamic slot engine, and zero waiting-time triage.
            </p>

            {/* Doctor Search Bar Form */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="bg-white p-2 rounded-2xl border border-gray-300 shadow-md flex flex-col md:flex-row items-center gap-2">
                {/* City Picker */}
                <div className="w-full md:w-48 flex items-center gap-2 px-3 py-2 border-b md:border-b-0 md:border-r border-gray-200">
                  <span className="text-gray-400 text-sm">📍</span>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="Pune">Pune (Central Campus)</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="ALL">All Network Cities</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="w-full flex-1 flex items-center gap-2 px-3 py-1">
                  <span className="text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for Doctors, Specialities, or Symptoms (e.g. Ketan Vartak, Urology, Knee...)"
                    className="w-full text-sm font-medium outline-none placeholder:text-gray-400 bg-transparent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-3 bg-[#0072CE] hover:bg-[#005ea2] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Search Doctors</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </form>

            {/* Quick Speciality Chips */}
            <div className="pt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                Popular:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSpeciality('ALL')}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition cursor-pointer border ${
                  selectedSpeciality === 'ALL'
                    ? 'bg-[#0072CE] text-white border-[#0072CE]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                }`}
              >
                All Specialities
              </button>
              {quickSpecialities.map((spec) => (
                <button
                  key={spec.label}
                  type="button"
                  onClick={() => setSelectedSpeciality(spec.label)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
                    selectedSpeciality === spec.label
                      ? 'bg-[#0072CE] text-white border-[#0072CE]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span>{spec.icon}</span>
                  <span>{spec.label}</span>
                </button>
              ))}
            </div>

            {/* User quick actions */}
            {user && (
              <div className="pt-2 flex items-center gap-3 text-xs">
                <span className="text-gray-500">Welcome, <strong>{user.name}</strong> ({user.role})</span>
                <Link
                  to={getDashboardPath(user.role)}
                  className="text-[#0072CE] font-bold hover:underline flex items-center gap-1"
                >
                  <span>Go to My Dashboard</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================= */}
        {/* DOCTORS DIRECTORY PREVIEW: Live Doctor Cards Grid             */}
        {/* ============================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[#111827] tracking-tight">
                  Available Specialists In {selectedCity === 'ALL' ? 'MediFlow Network' : selectedCity}
                </h2>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>
                  Total Registered Specialists:{' '}
                  <strong className="text-[#0072CE] font-bold">
                    {doctors.length} Verified
                  </strong>
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Clinic Presence Active
                </span>
              </div>
            </div>

            <Link
              to="/doctors"
              className="text-xs font-bold text-[#0072CE] hover:text-[#005ea2] flex items-center gap-1 transition"
            >
              <span>Explore All {doctors.length} Doctors in Directory</span>
              <span>&rarr;</span>
            </Link>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-gray-200">
              <div className="w-10 h-10 border-4 border-[#0072CE] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-gray-600">Loading verified specialists...</p>
            </div>
          ) : displayedDoctors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md mx-auto">
              <span className="text-4xl block mb-2">🩺</span>
              <h3 className="text-base font-bold text-gray-800">No Doctors Match Your Search</h3>
              <p className="text-xs text-gray-500 mt-1">
                Try selecting &apos;All Specialities&apos; or reset your search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpeciality('ALL');
                }}
                className="mt-4 px-4 py-2 bg-[#0072CE] text-white text-xs font-bold rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  selectedCity={selectedCity}
                  onCallDoctor={setCallModalDoctor}
                  onShare={handleShare}
                />
              ))}
            </div>
          )}

          {/* View Full Directory Banner */}
          <div className="text-center pt-4">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white hover:bg-gray-50 text-[#0072CE] font-black text-xs rounded-2xl border-2 border-[#0072CE] shadow-sm transition"
            >
              <span>🩺 View Full Doctors Directory &amp; Filter By All Medical Departments</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 3 CORE PATIENT CAPABILITIES CARDS                              */}
        {/* ============================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0072CE] flex items-center justify-center text-2xl mb-4">
                📲
              </div>
              <h3 className="font-extrabold text-gray-900 text-sm mb-1">
                QR-Based Patient Check-In
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Scan your verified cryptographic QR appointment token at hospital reception to immediately check in and enter the OPD queue.
              </p>
            </div>
            <Link
              to="/check-in"
              className="mt-4 text-xs font-bold text-[#0072CE] hover:underline flex items-center gap-1"
            >
              <span>Reception Scanner</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
                ⚡
              </div>
              <h3 className="font-extrabold text-gray-900 text-sm mb-1">
                Smart Waitlist Auto-Allocation
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                When booked slots cancel, our rule-based triage automatically assigns the appointment to the highest priority waitlisted patient.
              </p>
            </div>
            <Link
              to="/waitlist"
              className="mt-4 text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
            >
              <span>Join Smart Waitlist</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mb-4">
                ⏱️
              </div>
              <h3 className="font-extrabold text-gray-900 text-sm mb-1">
                Live OPD Queue &amp; Waiting Time
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Real-time queue tracking powered by Socket.IO. See who is currently with the doctor and your exact estimated waiting minutes.
              </p>
            </div>
            <Link
              to="/doctors"
              className="mt-4 text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View Doctor Queues</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 24/7 HELPLINE & EMERGENCY CONSULTATION SECTION                 */}
        {/* ============================================================= */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-bold tracking-widest text-blue-300 uppercase">
                Emergency &amp; Helpline Desk
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">
                Need Urgent Medical Care?
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                MediFlow Central Hospital emergency medicine department and rapid-response ambulances operate 24 hours a day, 365 days a year.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <a
                href="tel:18002003569"
                className="px-6 py-3.5 bg-[#F5A623] hover:bg-[#E09823] text-gray-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <span>📞 Dial 1800-200-FLOW (Toll-Free)</span>
              </a>
              <a
                href="tel:+912026124000"
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-2"
              >
                <span>Direct Desk: +91 (020) 2612-4000</span>
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* SYSTEM HEALTH & CAPSTONE ARCHITECTURE SECTION (For Viva)      */}
        {/* ============================================================= */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛠️</span>
              <h3 className="font-extrabold text-sm text-gray-900">
                System Health &amp; Capstone Technical Architecture
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowArchDetails((prev) => !prev)}
              className="text-xs font-bold text-[#0072CE] hover:underline cursor-pointer"
            >
              {showArchDetails ? 'Hide Diagnostics ▲' : 'Show Diagnostics ▼'}
            </button>
          </div>

          {showArchDetails && (
            <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in">
              <ServerStatus />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="font-bold text-gray-800">Database</p>
                  <p className="text-gray-500">PostgreSQL + Prisma ORM (Port 5432)</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="font-bold text-gray-800">Real-Time Sync</p>
                  <p className="text-gray-500">Socket.IO Event Gateway (Active)</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="font-bold text-gray-800">Authentication</p>
                  <p className="text-gray-500">JWT + HTTP-Only Secure Cookies</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="font-bold text-gray-800">Attendance Verification</p>
                  <p className="text-gray-500">Cryptographic Time-Limited QR</p>
                </div>
              </div>
            </div>
          )}

          {/* Capstone Verification Ribbon */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <span>🎓</span>
              <span><strong>MediFlow AI Capstone Project:</strong> Verified Production Architecture (Phases 1–12 Operational)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All 12 Phases Verified</span>
            </div>
          </div>
        </section>

        {/* CALL NOW MODAL */}
        <CallNowModal
          doctor={callModalDoctor}
          onClose={() => setCallModalDoctor(null)}
        />

        {/* FLOATING HELPER BUBBLE */}
        <MediFlowHelperBubble />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System &bull; Production Architecture
      </footer>
    </div>
  );
}

export default HomePage;
