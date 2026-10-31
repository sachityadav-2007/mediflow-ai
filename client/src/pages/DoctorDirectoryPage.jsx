import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getDoctors } from '../services/api';

function DoctorDirectoryPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState('');

  // Specialization categories for filter dropdown
  const specializations = [
    'ALL',
    'Cardiologist',
    'Neurologist',
    'Orthopedics',
    'General Medicine',
    'Pediatrics',
    'Dermatology',
  ];

  const fetchDoctors = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (specialization !== 'ALL') params.specialization = specialization;

      const data = await getDoctors(params);
      if (data && data.success) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Unable to load doctor directory.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [specialization]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors();
  };

  const getPresenceBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            PRESENT
          </span>
        );
      case 'BUSY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            BUSY
          </span>
        );
      case 'AWAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            AWAY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Find &amp; Consult Doctors
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse verified medical specialists, check live clinic presence, and review consultation details.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row gap-3 items-center justify-between"
          >
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by doctor name, department, or specialization..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Specialization Filter */}
            <div className="w-full sm:w-60">
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec === 'ALL' ? 'All Specializations' : spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-500">Loading doctor directory...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-md mx-auto">
            <span className="text-4xl block mb-2">🩺</span>
            <h3 className="text-base font-bold text-gray-800">No Doctors Found</h3>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search query or reset the specialization filter.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSpecialization('ALL');
              }}
              className="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Doctors Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Presence Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg shadow-inner">
                      {doctor.user.name.charAt(0)}
                    </div>
                    {getPresenceBadge(doctor.currentPresence)}
                  </div>

                  {/* Doctor Info */}
                  <h3 className="text-lg font-bold text-gray-900">{doctor.user.name}</h3>
                  <p className="text-sm font-semibold text-blue-600">
                    {doctor.specialization}
                  </p>
                  <p className="text-xs text-gray-500">{doctor.department}</p>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Experience:</span>
                      <span className="font-semibold text-gray-700">
                        {doctor.experience} years
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Qualification:</span>
                      <span className="font-semibold text-gray-700">
                        {doctor.qualification}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consultation Fee:</span>
                      <span className="font-bold text-green-700">
                        ₹{doctor.consultationFee}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="font-semibold text-gray-700">
                        {doctor.consultationDuration || 30} mins
                      </span>
                    </div>
                    {doctor.roomNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Room / Clinic:</span>
                        <span className="font-semibold text-gray-700">
                          {doctor.roomNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Working Days Badges */}
                  {doctor.availabilities && doctor.availabilities.length > 0 && (
                    <div className="mt-3 pt-2">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Active Days:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {doctor.availabilities.map((avail) => (
                          <span
                            key={avail.id}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700"
                            title={`${avail.startTime} - ${avail.endTime}`}
                          >
                            {avail.dayOfWeek.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400 text-center">
                    Contact: <span className="text-gray-700 font-medium">{doctor.user.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 4 Doctor Directory
      </footer>
    </div>
  );
}

export default DoctorDirectoryPage;

