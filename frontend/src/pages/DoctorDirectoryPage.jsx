import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getDoctors } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import DoctorCard from '../components/DoctorCard';
import CallNowModal from '../components/CallNowModal';
import MediFlowHelperBubble from '../components/MediFlowHelperBubble';

// Canonical hospital specialities list for specialist directory
const CANONICAL_SPECIALITIES = [
  'Anesthesiology',
  'Bariatrics',
  'Cardiac Sciences',
  'Cosmetology and Plastic Surgery',
  'Critical Care and Emergency Medicine',
  'Dentistry',
  'Dermatology',
  'Dietician and Nutrition',
  'Emergency Medicine',
  'ENT',
  'Gastroenterology',
  'General Surgery',
  'Nephrology',
  'Neurology',
  'Neurosciences',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Urology',
];

const CANONICAL_CITIES = [
  'Pune',
  'Ahmedabad',
  'Bangalore',
  'Chennai',
  'Delhi NCR',
  'Hyderabad',
  'Kolkata',
  'Mumbai',
];

function DoctorDirectoryPage() {
  // State Management
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialities, setSelectedSpecialities] = useState([]);
  const [specialitySearch, setSpecialitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('Pune');
  const [selectedPresence, setSelectedPresence] = useState('ALL');
  const [selectedExperience, setSelectedExperience] = useState('ALL');

  // Modals & Feedback
  const [callModalDoctor, setCallModalDoctor] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Accordion toggle states
  const [specialityExpanded, setSpecialityExpanded] = useState(true);
  const [cityExpanded, setCityExpanded] = useState(true);

  // Fetch Doctors from Backend API
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
        err.response?.data?.message ||
          'Unable to load doctor directory. Please ensure backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Real-time Socket.IO: live presence synchronization without reload
  useSocket('doctor_status_changed', (data) => {
    if (data?.doctorId) {
      const nextStatus = data.presenceStatus || data.status;
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === data.doctorId
            ? { ...doc, currentPresence: nextStatus }
            : doc
        )
      );
    }
  });

  useSocket('doctor_attendance_updated', (data) => {
    if (data?.doctorId) {
      const nextStatus =
        data.action === 'CHECK_OUT' ? 'OFFLINE' : data.presenceStatus || 'PRESENT';
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === data.doctorId
            ? { ...doc, currentPresence: nextStatus }
            : doc
        )
      );
    }
  });

  // Extract unique specializations with count from actual DB doctors
  const specialityCounts = useMemo(() => {
    const counts = {};
    doctors.forEach((d) => {
      const spec = d.specialization || 'General Medicine';
      counts[spec] = (counts[spec] || 0) + 1;
    });
    return counts;
  }, [doctors]);

  // Combined specialities list (canonical + actual present in DB)
  const allSpecialityNames = useMemo(() => {
    const set = new Set([...CANONICAL_SPECIALITIES, ...Object.keys(specialityCounts)]);
    return Array.from(set).sort();
  }, [specialityCounts]);

  // Specialities filtered by sidebar search
  const displayedSpecialities = useMemo(() => {
    if (!specialitySearch.trim()) return allSpecialityNames;
    return allSpecialityNames.filter((s) =>
      s.toLowerCase().includes(specialitySearch.trim().toLowerCase())
    );
  }, [allSpecialityNames, specialitySearch]);

  // Handle Speciality Checkbox Toggle
  const toggleSpeciality = (spec) => {
    setSelectedSpecialities((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  // Client-Side Filtering
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Search Query
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

      // Speciality Multi-Select Filter
      if (selectedSpecialities.length > 0) {
        if (!selectedSpecialities.includes(doc.specialization)) {
          return false;
        }
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
  }, [doctors, searchQuery, selectedSpecialities, selectedPresence, selectedExperience]);

  // Clear all filters
  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedSpecialities([]);
    setSpecialitySearch('');
    setSelectedCity('Pune');
    setSelectedPresence('ALL');
    setSelectedExperience('ALL');
  };

  // Share doctor profile handler
  const handleShare = (doc) => {
    const shareUrl = `${window.location.origin}/book?doctorId=${doc.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setToastMessage(`✓ Link copied for ${doc.user?.name || doc.name}`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between relative">
      <Navbar />

      {/* Copy Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gray-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-gray-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4 font-medium">
          <Link to="/" className="hover:text-blue-600 transition">
            Home
          </Link>
          <span>&gt;</span>
          <span className="font-semibold text-gray-800">Doctors Directory</span>
        </nav>

        {/* Header: Title, Total Count & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Best Specialists In {selectedCity === 'ALL' ? 'MediFlow Network' : selectedCity}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm font-semibold text-gray-600">
                Verified Specialists:{' '}
                <strong className="text-blue-700 font-bold">
                  {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'}
                </strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                ● Live Clinic Presence Active
              </span>
            </div>
          </div>

          {/* Top Right Doctor Search Bar */}
          <div className="w-full md:w-96">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Doctors by Name, Speciality, or Room"
                className="w-full pl-4 pr-12 py-2.5 text-sm bg-white border border-gray-300 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400 font-medium"
              />
              <button
                type="button"
                className="absolute right-1.5 w-8 h-8 rounded-lg bg-[#0072CE] hover:bg-[#005ea2] text-white flex items-center justify-center text-xs shadow-xs transition cursor-pointer"
                title="Search Doctors"
              >
                🔍
              </button>
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
          {/* LEFT SIDEBAR: "Filter By" Section                              */}
          {/* ============================================================= */}
          <aside className="w-full md:w-64 lg:w-72 bg-white rounded-2xl border border-gray-200 shadow-xs p-5 shrink-0 space-y-6">
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <h2 className="text-sm font-black text-gray-900 tracking-tight">Filter By</h2>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-[#0072CE] hover:text-[#005ea2] transition cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* 1. Speciality Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setSpecialityExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between mb-2 text-left cursor-pointer"
              >
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                  Speciality
                </h3>
                <span className="text-xs text-gray-400 font-bold">
                  {specialityExpanded ? '▲' : '▼'}
                </span>
              </button>

              {specialityExpanded && (
                <div className="space-y-2 mt-2">
                  {/* Speciality Internal Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={specialitySearch}
                      onChange={(e) => setSpecialitySearch(e.target.value)}
                      placeholder="Search Speciality"
                      className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                    />
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 text-xs">
                      🔍
                    </span>
                  </div>

                  {/* Speciality Checkbox List */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs pt-1">
                    {displayedSpecialities.map((spec) => {
                      const count = specialityCounts[spec] || 0;
                      const isChecked = selectedSpecialities.includes(spec);
                      return (
                        <label
                          key={spec}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-700"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSpeciality(spec)}
                              className="w-3.5 h-3.5 rounded text-[#0072CE] focus:ring-[#0072CE] cursor-pointer"
                            />
                            <span className={`truncate text-xs ${isChecked ? 'font-bold text-[#0072CE]' : 'font-medium'}`}>
                              {spec}
                            </span>
                          </div>
                          {count > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 shrink-0 ml-1">
                              ({count})
                            </span>
                          )}
                        </label>
                      );
                    })}

                    {displayedSpecialities.length === 0 && (
                      <p className="text-xs text-gray-400 py-2 text-center">
                        No matching specialities
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. City Accordion */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCityExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between mb-2 text-left cursor-pointer"
              >
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                  Campus / City
                </h3>
                <span className="text-xs text-gray-400 font-bold">
                  {cityExpanded ? '▲' : '▼'}
                </span>
              </button>

              {cityExpanded && (
                <div className="space-y-1.5 text-xs pt-1">
                  {CANONICAL_CITIES.map((city) => (
                    <label
                      key={city}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="city"
                        checked={selectedCity === city}
                        onChange={() => setSelectedCity(city)}
                        className="text-[#0072CE] focus:ring-[#0072CE] cursor-pointer"
                      />
                      <span className={`text-xs ${selectedCity === city ? 'font-bold text-[#0072CE]' : 'text-gray-700 font-medium'}`}>
                        {city}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="city"
                      checked={selectedCity === 'ALL'}
                      onChange={() => setSelectedCity('ALL')}
                      className="text-[#0072CE] focus:ring-[#0072CE] cursor-pointer"
                    />
                    <span className={`text-xs ${selectedCity === 'ALL' ? 'font-bold text-[#0072CE]' : 'text-gray-700 font-medium'}`}>
                      All Campuses
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* 3. Clinic Live Presence Filter */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 mb-2">
                Clinic Presence
              </h3>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="presence"
                    checked={selectedPresence === 'ALL'}
                    onChange={() => setSelectedPresence('ALL')}
                    className="text-[#0072CE] cursor-pointer"
                  />
                  <span>All Registered Doctors</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="presence"
                    checked={selectedPresence === 'PRESENT'}
                    onChange={() => setSelectedPresence('PRESENT')}
                    className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Present in Hospital
                  </span>
                </label>
              </div>
            </div>

            {/* 4. Clinical Experience Filter */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 mb-2">
                Experience
              </h3>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={selectedExperience === 'ALL'}
                    onChange={() => setSelectedExperience('ALL')}
                    className="text-[#0072CE] cursor-pointer"
                  />
                  <span>All Experience Levels</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={selectedExperience === '10'}
                    onChange={() => setSelectedExperience('10')}
                    className="text-[#0072CE] cursor-pointer"
                  />
                  <span>10+ Years Senior Specialists</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    checked={selectedExperience === '20'}
                    onChange={() => setSelectedExperience('20')}
                    className="text-[#0072CE] cursor-pointer"
                  />
                  <span>20+ Years Veteran Consultants</span>
                </label>
              </div>
            </div>

            {/* OPD Queue Direct Shortcut */}
            <div className="pt-4 border-t border-gray-100">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-xs">
                <p className="font-bold text-blue-900 mb-1">🏥 OPD Live Queue Boards</p>
                <p className="text-blue-700 text-[11px] leading-relaxed">
                  Real-time consultation status and waiting times are broadcast for each doctor.
                </p>
                <Link
                  to="/check-in"
                  className="mt-2 block text-center font-bold text-[11px] text-white bg-[#0072CE] hover:bg-[#005ea2] py-1.5 rounded-lg transition"
                >
                  Reception Check-In Scanner &rarr;
                </Link>
              </div>
            </div>
          </aside>

          {/* ============================================================= */}
          {/* RIGHT MAIN CONTENT: Doctor Cards Grid                         */}
          {/* ============================================================= */}
          <div className="flex-1 w-full">
            {loading ? (
              <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-gray-200">
                <div className="w-10 h-10 border-4 border-[#0072CE] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-semibold text-gray-600">Loading verified doctors...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-lg mx-auto">
                <span className="text-5xl block mb-3">🩺</span>
                <h3 className="text-lg font-bold text-gray-800">No Doctors Match Your Filters</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  We couldn&apos;t find any specialists matching your search criteria. Try resetting your filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mt-5 px-5 py-2 bg-[#0072CE] hover:bg-[#005ea2] text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              /* Doctor Cards 2-Column Responsive Grid */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {filteredDoctors.map((doctor) => (
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
          </div>
        </div>

        {/* CALL NOW MODAL */}
        <CallNowModal
          doctor={callModalDoctor}
          onClose={() => setCallModalDoctor(null)}
        />

        {/* FLOATING HELPER BUBBLE */}
        <MediFlowHelperBubble />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System &bull; Production Architecture
      </footer>
    </div>
  );
}

export default DoctorDirectoryPage;
