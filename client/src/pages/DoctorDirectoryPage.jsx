import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getDoctors } from '../services/api';
import { useSocket } from '../hooks/useSocket';

// Stylized Medical Avatar component that generates realistic clinical doctor illustrations
function DoctorAvatar({ name, specialization }) {
  // Deterministic color palette and styling based on doctor name
  const isFemale = name.includes('Ananya') || name.includes('Smruti') || name.includes('Vidita');
  const bgColors = [
    'from-blue-50 to-indigo-100 border-blue-200 text-blue-700',
    'from-teal-50 to-emerald-100 border-teal-200 text-teal-700',
    'from-sky-50 to-cyan-100 border-sky-200 text-sky-700',
    'from-amber-50 to-orange-100 border-amber-200 text-amber-700',
    'from-purple-50 to-violet-100 border-purple-200 text-purple-700',
  ];
  const colorIndex = Math.abs(name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % bgColors.length;
  const colorClass = bgColors[colorIndex];

  return (
    <div
      className={`w-28 h-32 sm:w-32 sm:h-36 rounded-xl bg-gradient-to-b ${colorClass} border flex flex-col items-center justify-between p-2 shrink-0 relative overflow-hidden shadow-sm`}
    >
      {/* Top Specialty Badge */}
      <div className="w-full text-center">
        <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/80 shadow-xs backdrop-blur-xs">
          {specialization.slice(0, 10)}
        </span>
      </div>

      {/* Clinical Silhouette / Icon */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl border border-gray-100">
          {isFemale ? '👩‍⚕️' : '👨‍⚕️'}
        </div>
      </div>

      {/* Bottom Verified Specialist Ribbon */}
      <div className="w-full text-center py-0.5 bg-blue-600/90 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1">
        <span>✓</span>
        <span>Verified</span>
      </div>
    </div>
  );
}

function DoctorDirectoryPage() {
  const navigate = useNavigate();

  // State Management
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Search & Filter States (Apollo Hospitals style)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState('ALL');
  const [specialitySearch, setSpecialitySearch] = useState('');
  const [selectedPresence, setSelectedPresence] = useState('ALL'); // 'ALL' | 'PRESENT' | 'ACCEPTING'
  const [selectedExperience, setSelectedExperience] = useState('ALL'); // 'ALL' | '10' | '20'

  // Modal detail view
  const [modalDoctor, setModalDoctor] = useState(null);

  // 1. Fetch Doctors from Backend API
  const fetchDoctors = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await getDoctors();
      if (data && data.success) {
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Unable to load doctor directory. Please ensure backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // 2. Real-time Socket.IO: live presence synchronization without page reload
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

  // Extract unique specializations list with doctor counts
  const specialityCounts = useMemo(() => {
    const counts = {};
    doctors.forEach((d) => {
      const spec = d.specialization || 'General Medicine';
      counts[spec] = (counts[spec] || 0) + 1;
    });
    return counts;
  }, [doctors]);

  // List of specialities filtered by the sidebar's internal search box
  const availableSpecialities = useMemo(() => {
    const list = Object.keys(specialityCounts).sort();
    if (!specialitySearch.trim()) return list;
    return list.filter((s) =>
      s.toLowerCase().includes(specialitySearch.trim().toLowerCase())
    );
  }, [specialityCounts, specialitySearch]);

  // 3. Multi-Criteria Client-Side Filtering
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Search Query: Match Name, Specialization, Department, or Qualification
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.user?.name?.toLowerCase().includes(q);
        const matchesSpec = doc.specialization?.toLowerCase().includes(q);
        const matchesDept = doc.department?.toLowerCase().includes(q);
        const matchesRoom = doc.roomNumber?.toLowerCase().includes(q);
        if (!matchesName && !matchesSpec && !matchesDept && !matchesRoom) {
          return false;
        }
      }

      // Speciality Filter
      if (selectedSpeciality !== 'ALL' && doc.specialization !== selectedSpeciality) {
        return false;
      }

      // Presence Filter
      if (selectedPresence === 'PRESENT' && doc.currentPresence !== 'PRESENT') {
        return false;
      }
      if (selectedPresence === 'ACCEPTING' && doc.currentPresence === 'OFFLINE') {
        return false;
      }

      // Experience Filter
      if (selectedExperience === '10' && doc.experience < 10) return false;
      if (selectedExperience === '20' && doc.experience < 20) return false;

      return true;
    });
  }, [doctors, searchQuery, selectedSpeciality, selectedPresence, selectedExperience]);

  // Clear all filters handler
  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedSpeciality('ALL');
    setSpecialitySearch('');
    setSelectedPresence('ALL');
    setSelectedExperience('ALL');
  };

  // Live presence pill badge
  const renderPresenceBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PRESENT
          </span>
        );
      case 'BUSY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            BUSY
          </span>
        );
      case 'AWAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            AWAY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Breadcrumb Navigation (Apollo Hospitals style) */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Link to="/" className="hover:text-blue-600 transition">
            Home
          </Link>
          <span>&bull;</span>
          <span className="font-semibold text-gray-800">Doctors Directory</span>
        </nav>

        {/* Page Title & Search Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Best Doctors &amp; Specialists
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm font-semibold text-gray-600">
                Total Doctors:{' '}
                <strong className="text-blue-700 font-bold">{filteredDoctors.length}</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                ● Live Clinic Presence Active
              </span>
            </div>
          </div>

          {/* Top Right Doctor Search Bar */}
          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Doctors..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Two-Column Layout: Sidebar Filters + Doctors Grid */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* ============================================================= */}
          {/* LEFT SIDEBAR: Apollo Hospitals "Filter By" Section             */}
          {/* ============================================================= */}
          <aside className="w-full md:w-64 lg:w-72 bg-white rounded-2xl border border-gray-200 shadow-xs p-5 shrink-0 space-y-6">
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-base">⚙️</span>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Filter By</h2>
              </div>
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* 1. Speciality Accordion */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Speciality
                </h3>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {Object.keys(specialityCounts).length} departments
                </span>
              </div>

              {/* Speciality Internal Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={specialitySearch}
                  onChange={(e) => setSpecialitySearch(e.target.value)}
                  placeholder="Search Speciality..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none"
                />
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400 text-xs">
                  🔍
                </span>
              </div>

              {/* Speciality Checkbox List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
                {/* All Specialities Option */}
                <label className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-gray-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="speciality"
                      checked={selectedSpeciality === 'ALL'}
                      onChange={() => setSelectedSpeciality('ALL')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">All Specialities</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400">
                    ({doctors.length})
                  </span>
                </label>

                {availableSpecialities.map((spec) => (
                  <label
                    key={spec}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-gray-700"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="radio"
                        name="speciality"
                        checked={selectedSpeciality === spec}
                        onChange={() => setSelectedSpeciality(spec)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{spec}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 shrink-0 ml-1">
                      ({specialityCounts[spec] || 0})
                    </span>
                  </label>
                ))}

                {availableSpecialities.length === 0 && (
                  <p className="text-xs text-gray-400 py-2 text-center">
                    No matching specialities
                  </p>
                )}
              </div>
            </div>

            {/* 2. Doctor Live Presence Status Filter */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5">
                Clinic Presence
              </h3>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="presence"
                    checked={selectedPresence === 'ALL'}
                    onChange={() => setSelectedPresence('ALL')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>All Doctors</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="presence"
                    checked={selectedPresence === 'PRESENT'}
                    onChange={() => setSelectedPresence('PRESENT')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1.5 font-medium text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Present in Hospital
                  </span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="presence"
                    checked={selectedPresence === 'ACCEPTING'}
                    onChange={() => setSelectedPresence('ACCEPTING')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active &amp; On Duty</span>
                </label>
              </div>
            </div>

            {/* 3. Clinical Experience Filter */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5">
                Experience
              </h3>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={selectedExperience === 'ALL'}
                    onChange={() => setSelectedExperience('ALL')}
                    className="text-blue-600"
                  />
                  <span>All Experience Levels</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={selectedExperience === '10'}
                    onChange={() => setSelectedExperience('10')}
                    className="text-blue-600"
                  />
                  <span>10+ Years Experience</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={selectedExperience === '20'}
                    onChange={() => setSelectedExperience('20')}
                    className="text-blue-600"
                  />
                  <span>20+ Years Senior Consultants</span>
                </label>
              </div>
            </div>

            {/* Quick Support / Need Help Card */}
            <div className="pt-4 border-t border-gray-100">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs">
                <p className="font-bold text-amber-900 mb-1">Need help choosing a doctor?</p>
                <p className="text-amber-700 text-[11px] leading-relaxed">
                  Join our smart priority triage waitlist if appointment slots for your preferred
                  specialist are occupied.
                </p>
                <Link
                  to="/waitlist"
                  className="mt-2 block text-center font-bold text-[11px] text-amber-900 bg-amber-200/80 hover:bg-amber-300 py-1 rounded-lg transition"
                >
                  Join Smart Waitlist &rarr;
                </Link>
              </div>
            </div>
          </aside>

          {/* ============================================================= */}
          {/* RIGHT MAIN CONTENT: Doctor Cards Grid                          */}
          {/* ============================================================= */}
          <div className="flex-1 w-full">
            {loading ? (
              <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-gray-200">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-semibold text-gray-600">Loading verified doctors...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-lg mx-auto">
                <span className="text-5xl block mb-3">🩺</span>
                <h3 className="text-lg font-bold text-gray-800">No Doctors Match Your Filters</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  We couldn&apos;t find any specialists matching your search criteria. Try resetting your
                  filters or searching by department.
                </p>
                <button
                  onClick={handleClearAll}
                  className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              /* Doctors Cards Grid (Apollo Hospitals 2-Column Responsive Layout) */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {filteredDoctors.map((doctor) => {
                  return (
                    <div
                      key={doctor.id}
                      className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                    >
                      {/* Doctor Card Top / Main Body */}
                      <div className="p-4 sm:p-5 flex gap-4 items-start">
                        {/* Left: Doctor Portrait & Specialization Badge */}
                        <DoctorAvatar
                          name={doctor.user.name}
                          specialization={doctor.specialization}
                        />

                        {/* Right: Doctor Credentials & Hospital Information */}
                        <div className="flex-1 min-w-0">
                          {/* Name + Live Status */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h3 className="text-base sm:text-lg font-black text-gray-900 truncate leading-snug group-hover:text-blue-700 transition">
                              {doctor.user.name}
                            </h3>
                          </div>

                          {/* Specialization / Department */}
                          <p className="text-xs font-bold text-blue-600 mb-1.5 flex items-center gap-1.5">
                            <span>{doctor.specialization}</span>
                            <span className="text-gray-300">&bull;</span>
                            <span className="text-gray-500 font-normal">
                              {doctor.department}
                            </span>
                          </p>

                          {/* Experience & Qualifications */}
                          <p className="text-xs text-gray-600 font-medium mb-2 truncate">
                            <strong>{doctor.experience}+ Years</strong> , {doctor.qualification}
                          </p>

                          {/* Hospital Clinic Location */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2.5">
                            <span className="text-blue-600">📍</span>
                            <span className="truncate">
                              {doctor.roomNumber || 'Room 101-B'}, MediFlow Hospital
                            </span>
                          </div>

                          {/* Fee, Duration & Live Status Strip */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-2 border-t border-gray-100">
                            <span className="font-extrabold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                              ₹{doctor.consultationFee}
                            </span>
                            <span className="text-gray-400">&bull;</span>
                            <span className="text-gray-500 font-medium">
                              {doctor.consultationDuration || 30} mins
                            </span>
                            <span className="ml-auto">
                              {renderPresenceBadge(doctor.currentPresence)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Doctor Card Bottom: Apollo Hospitals Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/70 border-t border-gray-100">
                        {/* Primary Button: Book Appointment (Apollo Yellow / Amber) */}
                        <Link
                          to={`/book?doctorId=${doctor.id}`}
                          className="w-full py-2.5 px-3 bg-[#F5A623] hover:bg-[#E09823] active:bg-[#C9841B] text-gray-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1 transition text-center"
                        >
                          <span>Book Appointment</span>
                          <span className="text-sm">↗</span>
                        </Link>

                        {/* Secondary Button: Doctor Schedule & Bio Details */}
                        <button
                          onClick={() => setModalDoctor(doctor)}
                          className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-bold text-xs rounded-xl border border-gray-200 hover:border-blue-300 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Doctor Details</span>
                          <span className="text-xs">ℹ️</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* MODAL: Doctor Full Details & Clinical Schedule Dialog          */}
        {/* ============================================================= */}
        {modalDoctor && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 relative">
                <button
                  onClick={() => setModalDoctor(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white text-xl font-bold p-1 leading-none cursor-pointer"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-3xl flex items-center justify-center shadow-inner">
                    👨‍⚕️
                  </div>
                  <div>
                    <h3 className="text-xl font-black">{modalDoctor.user.name}</h3>
                    <p className="text-blue-200 text-xs font-semibold">
                      {modalDoctor.specialization} &bull; {modalDoctor.department}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-gray-400 block font-medium">Experience</span>
                    <strong className="text-gray-800">{modalDoctor.experience} Years</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Consultation Fee</span>
                    <strong className="text-blue-700 font-bold">₹{modalDoctor.consultationFee}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Room / OPD</span>
                    <strong className="text-gray-800">
                      {modalDoctor.roomNumber || 'Room 101-B'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Current Status</span>
                    <div className="mt-0.5">{renderPresenceBadge(modalDoctor.currentPresence)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Qualifications &amp; Accreditations
                  </h4>
                  <p className="text-gray-700 text-xs font-medium">
                    {modalDoctor.qualification}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Weekly Working Schedule
                  </h4>
                  {modalDoctor.availabilities && modalDoctor.availabilities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {modalDoctor.availabilities.map((avail, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-center text-xs"
                        >
                          <span className="block font-bold text-blue-900 uppercase text-[10px]">
                            {avail.dayOfWeek}
                          </span>
                          <span className="text-gray-600 font-medium text-[11px]">
                            {avail.startTime} - {avail.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Consultation schedule configured dynamically by hospital administration.
                    </p>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const docId = modalDoctor.id;
                      setModalDoctor(null);
                      navigate(`/book?doctorId=${docId}`);
                    }}
                    className="flex-1 py-3 bg-[#F5A623] hover:bg-[#E09823] text-gray-950 font-black text-xs rounded-xl shadow-sm text-center transition cursor-pointer"
                  >
                    Proceed to Book Appointment ↗
                  </button>
                  <button
                    onClick={() => setModalDoctor(null)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System &bull; Apollo-Grade Specialist Network
      </footer>
    </div>
  );
}

export default DoctorDirectoryPage;
