import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats,
  getAdminDoctors,
  getAdminDoctorDetails,
  getAdminPatients,
  getAdminAppointments,
  getAdminWaitlist,
  triggerSmartAllocation,
  generateHospitalQR,
  revokeHospitalQR,
  getActiveHospitalQRCodes,
  getQRScanActivity,
  getAttendanceHistory,
} from '../services/api';
import AIIntelligenceCenter from '../components/AIIntelligenceCenter';
import { useSocket, useSocketStatus } from '../hooks/useSocket';

function AdminDashboard({ initialTab = 'overview' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active view tab: 'overview' | 'doctors' | 'patients' | 'appointments' | 'waitlist'
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync active tab when prop changes (e.g., URL navigation via Navbar)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Tab switch handler that also syncs browser route
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const routeMap = {
      overview: '/admin/dashboard',
      doctors: '/admin/doctors',
      patients: '/admin/patients',
      appointments: '/admin/appointments',
      waitlist: '/admin/waitlist',
      attendance: '/admin/attendance',
      intelligence: '/admin/intelligence',
    };
    navigate(routeMap[tabKey] || '/admin/dashboard');
  };

  // ---------------------------------------------------------------------------
  // Data States
  // ---------------------------------------------------------------------------
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Doctor Details Inspection Modal
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [doctorDetails, setDoctorDetails] = useState(null);
  const [loadingDoctorDetails, setLoadingDoctorDetails] = useState(false);

  // Filter States for Appointments
  const [appointmentFilters, setAppointmentFilters] = useState({
    status: 'ALL',
    doctorId: 'ALL',
    date: '',
  });

  // Filter States for Waitlist
  const [waitlistFilters, setWaitlistFilters] = useState({
    status: 'ALL',
    doctorId: 'ALL',
  });

  // Search terms for local quick filtering
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Doctor Attendance & Hospital QR Management States
  const [hospitalQRCodes, setHospitalQRCodes] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [qrScanAudits, setQrScanAudits] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [newQRLocation, setNewQRLocation] = useState('Main Hospital OPD Suite - Ground Floor');
  const [newQRValidity, setNewQRValidity] = useState(60);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [revokingCodeId, setRevokingCodeId] = useState(null);
  const [qrPreviewModal, setQrPreviewModal] = useState(null);
  const [attendanceFilterDoctor, setAttendanceFilterDoctor] = useState('ALL');
  const [attendanceFilterDate, setAttendanceFilterDate] = useState('');
  const [attendanceFilterLocation, setAttendanceFilterLocation] = useState('');

  // Socket.IO Connection Status
  const isSocketConnected = useSocketStatus();

  // Display temporary toast alert
  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // Fetch Functions
  // ---------------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminStats();
      if (res?.success) setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await getAdminDoctors();
      if (res?.success) setDoctors(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admin doctors:', err);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await getAdminPatients();
      if (res?.success) setPatients(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admin patients:', err);
    }
  }, []);

  const fetchAppointments = useCallback(async (filters = appointmentFilters) => {
    try {
      const params = {};
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.doctorId && filters.doctorId !== 'ALL') params.doctorId = filters.doctorId;
      if (filters.date) params.date = filters.date;

      const res = await getAdminAppointments(params);
      if (res?.success) setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admin appointments:', err);
    }
  }, [appointmentFilters]);

  const fetchWaitlist = useCallback(async (filters = waitlistFilters) => {
    try {
      const params = {};
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.doctorId && filters.doctorId !== 'ALL') params.doctorId = filters.doctorId;

      const res = await getAdminWaitlist(params);
      if (res?.success) setWaitlist(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admin waitlist:', err);
    }
  }, [waitlistFilters]);

  // Load all data on mount
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchStats(),
        fetchDoctors(),
        fetchPatients(),
        fetchAppointments(),
        fetchWaitlist(),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchDoctors, fetchPatients, fetchAppointments, fetchWaitlist]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Re-fetch appointments when filters change
  useEffect(() => {
    fetchAppointments(appointmentFilters);
  }, [appointmentFilters, fetchAppointments]);

  // Re-fetch waitlist when filters change
  useEffect(() => {
    fetchWaitlist(waitlistFilters);
  }, [waitlistFilters, fetchWaitlist]);

  // ---------------------------------------------------------------------------
  // Doctor Details Inspection Modal Handler
  // ---------------------------------------------------------------------------
  const handleInspectDoctor = async (doctorId) => {
    setSelectedDoctorId(doctorId);
    setLoadingDoctorDetails(true);
    try {
      const res = await getAdminDoctorDetails(doctorId);
      if (res?.success) {
        setDoctorDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load doctor details:', err);
      showToast(err.response?.data?.message || 'Failed to inspect doctor details.', 'error');
    } finally {
      setLoadingDoctorDetails(false);
    }
  };

  const closeDoctorModal = () => {
    setSelectedDoctorId(null);
    setDoctorDetails(null);
  };

  // ---------------------------------------------------------------------------
  // Trigger Smart Allocation Demo
  // ---------------------------------------------------------------------------
  const [allocatingDoctorId, setAllocatingDoctorId] = useState('');
  const [allocationLoading, setAllocationLoading] = useState(false);

  const handleTriggerAllocation = async (doctorId) => {
    if (!doctorId) {
      showToast('Please select a doctor to run allocation for.', 'error');
      return;
    }

    setAllocationLoading(true);
    try {
      const res = await triggerSmartAllocation({ doctorId });
      if (res?.success) {
        showToast(res.message || 'Smart allocation completed successfully!', 'success');
        fetchStats();
        fetchAppointments();
        fetchWaitlist();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Smart allocation failed.', 'error');
    } finally {
      setAllocationLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Real-Time Socket.IO Updates
  // ---------------------------------------------------------------------------
  useSocket('doctor_status_changed', (data) => {
    showToast(`⚡ Real-time: Doctor status updated (${data?.status || 'changed'})`, 'info');
    fetchStats();
    fetchDoctors();
  });

  useSocket('appointment_created', (data) => {
    showToast(`⚡ Real-time: New appointment booked (${data?.appointmentNumber || 'New'})`, 'info');
    fetchStats();
    fetchAppointments();
  });

  useSocket('appointment_cancelled', (data) => {
    showToast(`⚡ Real-time: Appointment cancelled (${data?.appointmentNumber || 'ID'})`, 'info');
    fetchStats();
    fetchAppointments();
    fetchWaitlist();
  });

  useSocket('waitlist_updated', () => {
    showToast('⚡ Real-time: Waitlist updated', 'info');
    fetchStats();
    fetchWaitlist();
  });

  useSocket('appointment_allocated', (data) => {
    showToast(`⚡ Real-time: Waitlist slot allocated! (${data?.appointmentNumber || ''})`, 'success');
    fetchStats();
    fetchAppointments();
    fetchWaitlist();
  });

  // Doctor Attendance & QR Data Fetcher
  const fetchAttendanceData = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const [qrsRes, attRes, scansRes] = await Promise.all([
        getActiveHospitalQRCodes(),
        getAttendanceHistory({
          doctorId: attendanceFilterDoctor === 'ALL' ? undefined : attendanceFilterDoctor,
          date: attendanceFilterDate || undefined,
          location: attendanceFilterLocation || undefined,
          limit: 30,
        }),
        getQRScanActivity(40),
      ]);

      if (qrsRes?.success) setHospitalQRCodes(qrsRes.qrCodes || []);
      if (attRes?.success) setAttendanceRecords(attRes.records || []);
      if (scansRes?.success) setQrScanAudits(scansRes.logs || []);
    } catch (err) {
      console.warn('Attendance data fetch notice:', err.message);
    } finally {
      setLoadingAttendance(false);
    }
  }, [attendanceFilterDoctor, attendanceFilterDate, attendanceFilterLocation]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceData();
    }
  }, [activeTab, fetchAttendanceData]);

  useSocket('doctor_attendance_updated', (data) => {
    showToast(
      `⚡ Real-time: Dr. ${data?.doctorName || ''} attendance updated (${data?.action || ''})`,
      'info'
    );
    fetchAttendanceData();
    fetchStats();
  });

  useSocket('hospital_qr_created', () => {
    fetchAttendanceData();
  });

  useSocket('hospital_qr_revoked', () => {
    fetchAttendanceData();
  });

  const handleCreateHospitalQR = async (e) => {
    e.preventDefault();
    if (!newQRLocation.trim()) return;
    setGeneratingQR(true);
    try {
      const res = await generateHospitalQR({
        location: newQRLocation.trim(),
        validityMinutes: parseInt(newQRValidity, 10),
      });
      if (res && res.success) {
        showToast(`✓ Generated QR code for "${res.location}"`, 'success');
        setQrPreviewModal(res);
        fetchAttendanceData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate QR code.', 'error');
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleRevokeCode = async (codeId) => {
    setRevokingCodeId(codeId);
    try {
      const res = await revokeHospitalQR(codeId);
      if (res && res.success) {
        showToast(res.message || 'QR code revoked.', 'success');
        fetchAttendanceData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke QR code.', 'error');
    } finally {
      setRevokingCodeId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Helper Formatters
  // ---------------------------------------------------------------------------
  const getPresenceBadge = (status) => {
    const config = {
      PRESENT: { bg: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500', text: 'Present' },
      BUSY: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500', text: 'Busy' },
      AWAY: { bg: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500', text: 'Away' },
      OFFLINE: { bg: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400', text: 'Offline' },
    };
    const c = config[status] || config.OFFLINE;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg}`}>
        <span className={`w-2 h-2 rounded-full ${c.dot}`}></span>
        {c.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const map = {
      SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
      CONFIRMED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      NO_SHOW: 'bg-gray-100 text-gray-700 border-gray-200',
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      ALLOCATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${map[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const map = {
      LOW: 'bg-gray-100 text-gray-700 border-gray-300',
      MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      EMERGENCY: 'bg-red-200 text-red-900 border-red-400 font-bold',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs border ${map[priority] || 'bg-gray-100 text-gray-700'}`}>
        {priority}
      </span>
    );
  };

  // Filtered lists for local quick search
  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.department.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(patientSearch.toLowerCase()) ||
      (p.phone && p.phone.includes(patientSearch))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center justify-between shadow-sm transition ${
              toastMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toastMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{toastMessage.type === 'error' ? '⚠️' : '⚡'}</span>
              <span>{toastMessage.message}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Admin Header Banner */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="inline-block px-3 py-1 text-xs font-bold bg-purple-500/30 border border-purple-300/30 rounded-full">
                  👑 Hospital Control Center
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                    isSocketConnected
                      ? 'bg-green-500/20 border-green-300/40 text-green-200'
                      : 'bg-amber-500/20 border-amber-300/40 text-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSocketConnected ? 'bg-green-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  ></span>
                  {isSocketConnected ? 'Live Socket.IO Active' : 'Polling Fallback'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Hospital Analytics &amp; Administration
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                Real-time monitoring of doctors, patients, appointments, and AI-inspired waitlist allocations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadAllData}
                disabled={loading}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                <span>Refresh Real-Time Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-1.5 flex flex-wrap gap-1">
          {[
            { key: 'overview', label: '📊 Dashboard Overview' },
            { key: 'doctors', label: `👨‍⚕️ Doctors (${doctors.length})` },
            { key: 'patients', label: `🧑‍🤝‍🧑 Patients (${patients.length})` },
            { key: 'appointments', label: `📅 Appointments (${appointments.length})` },
            { key: 'waitlist', label: `⏳ Smart Waitlist (${waitlist.length})` },
            { key: 'attendance', label: '📷 Attendance & QR' },
            { key: 'intelligence', label: '🧠 AI Intelligence (v2.0 ML)' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition text-center cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Loading Spinner */}
        {loading && !stats && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-medium text-gray-500">
              Loading hospital analytics from PostgreSQL...
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 mb-8 text-sm flex items-center justify-between">
            <div>
              <p className="font-bold">Error Loading Admin Data</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
            <button
              onClick={loadAllData}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* 1. Statistics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Card 1: Total Doctors */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Doctors</span>
                    <span className="text-xl">👨‍⚕️</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900">{stats.totalDoctors}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex flex-wrap gap-1">
                  <span className="text-green-600 font-semibold">{stats.doctorsPresent} Present</span>
                  <span>&bull;</span>
                  <span className="text-yellow-600 font-semibold">{stats.doctorsBusy} Busy</span>
                  <span>&bull;</span>
                  <span className="text-gray-400 font-semibold">{stats.doctorsOffline} Off</span>
                </div>
              </div>

              {/* Card 2: Total Patients */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Patients</span>
                    <span className="text-xl">🧑‍🤝‍🧑</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900">{stats.totalPatients}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                  Registered patient profiles
                </div>
              </div>

              {/* Card 3: Total Appointments */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Appointments</span>
                    <span className="text-xl">📅</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900">{stats.totalAppointments}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex flex-wrap gap-1">
                  <span className="text-blue-600 font-semibold">{stats.activeAppointments} Active</span>
                  <span>&bull;</span>
                  <span className="text-green-600 font-semibold">{stats.completedAppointments} Done</span>
                </div>
              </div>

              {/* Card 4: Active Waitlist */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Waitlist</span>
                    <span className="text-xl">⏳</span>
                  </div>
                  <div className="text-3xl font-extrabold text-purple-700">{stats.activeWaitlistEntries}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-purple-600 font-medium">
                  Smart queue pending triage
                </div>
              </div>

              {/* Card 5: Doctors Present */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Doctors Present</span>
                    <span className="text-xl">🟢</span>
                  </div>
                  <div className="text-3xl font-extrabold text-green-600">{stats.doctorsPresent}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-green-700 font-medium">
                  Currently on hospital duty
                </div>
              </div>
            </div>

            {/* 2. Doctor Overview Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>👨‍⚕️</span>
                    <span>Doctor Overview</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Live presence status and clinical capacity
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange('doctors')}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  Manage All Doctors &rarr;
                </button>
              </div>

              {doctors.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No doctors found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-y border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Doctor Name</th>
                        <th className="py-3 px-4">Specialization</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Presence Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {doctors.slice(0, 5).map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{doc.name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                                Simulated Specialist
                              </span>
                            </div>
                            <div className="text-xs font-normal text-gray-400">{doc.email}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{doc.specialization}</td>
                          <td className="py-3 px-4 text-gray-500">{doc.department}</td>
                          <td className="py-3 px-4">{getPresenceBadge(doc.currentPresence)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspectDoctor(doc.id)}
                              className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Recent Appointments & Waitlist Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Appointments */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>📅</span>
                        <span>Recent Appointments</span>
                      </h2>
                      <p className="text-xs text-gray-500">Latest hospital bookings</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('appointments')}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {appointments.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No appointments found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-y border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">Patient</th>
                            <th className="py-2.5 px-3">Doctor</th>
                            <th className="py-2.5 px-3">Date &amp; Time</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {appointments.slice(0, 5).map((apt) => (
                            <tr key={apt.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-semibold text-gray-800">
                                {apt.patient.name}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">{apt.doctor.name}</td>
                              <td className="py-2.5 px-3 text-gray-500">
                                {new Date(apt.appointmentDate).toLocaleDateString()}
                                <div className="text-[10px] text-gray-400">{apt.startTime} - {apt.endTime}</div>
                              </td>
                              <td className="py-2.5 px-3">{getStatusBadge(apt.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Waitlist Overview */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>⏳</span>
                        <span>Waitlist Overview</span>
                      </h2>
                      <p className="text-xs text-gray-500">Intelligent priority queue</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('waitlist')}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {waitlist.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No active waitlist entries.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-y border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">Patient</th>
                            <th className="py-2.5 px-3">Doctor</th>
                            <th className="py-2.5 px-3">Score</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {waitlist.slice(0, 5).map((w) => (
                            <tr key={w.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-semibold text-gray-800">
                                {w.patientName}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">{w.doctorName}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[11px] bg-purple-100 text-purple-800">
                                  ⚡ {w.priorityScore} pts
                                </span>
                              </td>
                              <td className="py-2.5 px-3">{getStatusBadge(w.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: DOCTOR MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Hospital Medical Staff</h2>
                <p className="text-xs text-gray-500">
                  Doctor credentials, live presence, and clinical workload
                </p>
              </div>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search doctors by name or specialization..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {filteredDoctors.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <span className="text-4xl">👨‍⚕️</span>
                <p className="mt-2 text-sm">No doctors match your search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-y border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Specialization</th>
                      <th className="py-3 px-4">Experience</th>
                      <th className="py-3 px-4">Duration &amp; Fee</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Presence</th>
                      <th className="py-3 px-4">Appointments</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDoctors.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-gray-900">{doc.name}</p>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                              Simulated Specialist
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{doc.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800">{doc.specialization}</p>
                          <p className="text-xs text-gray-400">{doc.department}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{doc.experience} yrs</td>
                        <td className="py-3 px-4 text-xs text-gray-600">
                          {doc.consultationDuration} min &bull; ₹{doc.consultationFee}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{doc.roomNumber}</td>
                        <td className="py-3 px-4">{getPresenceBadge(doc.currentPresence)}</td>
                        <td className="py-3 px-4 font-semibold text-gray-700">
                          {doc.totalAppointments} booked
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleInspectDoctor(doc.id)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: PATIENT MANAGEMENT */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Registered Patients Directory</h2>
                <p className="text-xs text-gray-500">
                  Patient account records, appointment counts, and active triage status
                </p>
              </div>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search patients by name, email, or phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <span className="text-4xl">🧑‍🤝‍🧑</span>
                <p className="mt-2 text-sm">No patients match your search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-y border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Blood Group</th>
                      <th className="py-3 px-4">Appointments</th>
                      <th className="py-3 px-4">Active Waitlist</th>
                      <th className="py-3 px-4">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPatients.map((pat) => (
                      <tr key={pat.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{pat.name}</span>
                            {pat.email?.includes('example.com') || pat.email?.includes('test') || pat.name?.includes('Patient') ? (
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-200">
                                Synthetic / Test
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                                Verified Profile
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600">{pat.email}</td>
                        <td className="py-3 px-4 text-xs text-gray-600">{pat.phone}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-700">
                          {pat.bloodGroup}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {pat.totalAppointments}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {pat.hasActiveWaitlist ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <span>⏳</span>
                              <span>In Queue ({pat.activeWaitlistDoctors?.join(', ') || 'Waitlisted'})</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(pat.registeredAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: APPOINTMENTS MONITORING */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Hospital Appointment Monitor</h2>
                <p className="text-xs text-gray-500">
                  Filter by clinical status, specific doctor, or appointment date
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={appointmentFilters.status}
                  onChange={(e) =>
                    setAppointmentFilters({ ...appointmentFilters, status: e.target.value })
                  }
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>

                {/* Doctor Filter */}
                <select
                  value={appointmentFilters.doctorId}
                  onChange={(e) =>
                    setAppointmentFilters({ ...appointmentFilters, doctorId: e.target.value })
                  }
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>

                {/* Date Filter */}
                <input
                  type="date"
                  value={appointmentFilters.date}
                  onChange={(e) =>
                    setAppointmentFilters({ ...appointmentFilters, date: e.target.value })
                  }
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500"
                />

                {/* Reset Filters */}
                <button
                  onClick={() =>
                    setAppointmentFilters({ status: 'ALL', doctorId: 'ALL', date: '' })
                  }
                  className="text-xs px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition"
                >
                  Reset
                </button>
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <span className="text-4xl">📅</span>
                <p className="mt-2 text-sm">No appointments found matching the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-y border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Appointment #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 font-mono text-xs font-bold text-gray-900">
                          {apt.appointmentNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">{apt.patient.name}</p>
                          <p className="text-xs text-gray-400">{apt.patient.phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">{apt.doctor.name}</p>
                          <p className="text-xs text-gray-400">{apt.doctor.specialization}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-700">
                          <p className="font-medium">
                            {new Date(apt.appointmentDate).toLocaleDateString()}
                          </p>
                          <p className="text-gray-400">{apt.startTime} - {apt.endTime}</p>
                        </td>
                        <td className="py-3 px-4">{getPriorityBadge(apt.priority)}</td>
                        <td className="py-3 px-4">{getStatusBadge(apt.status)}</td>
                        <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                          {apt.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: SMART WAITLIST MONITORING */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'waitlist' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>⏳</span>
                  <span>AI-Inspired Smart Waitlist Queue</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Ranked in real time by Medical Priority + Clinical Urgency + Waiting Duration
                </p>
              </div>

              {/* Filters & Demo Action */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={waitlistFilters.status}
                  onChange={(e) =>
                    setWaitlistFilters({ ...waitlistFilters, status: e.target.value })
                  }
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="ALLOCATED">ALLOCATED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>

                {/* Doctor Filter */}
                <select
                  value={waitlistFilters.doctorId}
                  onChange={(e) =>
                    setWaitlistFilters({ ...waitlistFilters, doctorId: e.target.value })
                  }
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>

                {/* Trigger Allocation Demo Dropdown & Button */}
                <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                  <select
                    value={allocatingDoctorId}
                    onChange={(e) => setAllocatingDoctorId(e.target.value)}
                    className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 bg-white"
                  >
                    <option value="">Select Doctor for Demo...</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleTriggerAllocation(allocatingDoctorId)}
                    disabled={allocationLoading || !allocatingDoctorId}
                    className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {allocationLoading ? 'Allocating...' : '⚡ Trigger Allocation'}
                  </button>
                </div>
              </div>
            </div>

            {waitlist.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <span className="text-4xl">⏳</span>
                <p className="mt-2 text-sm">No waitlist entries found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-y border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Medical Priority</th>
                      <th className="py-3 px-4">Clinical Urgency</th>
                      <th className="py-3 px-4">Priority Score</th>
                      <th className="py-3 px-4">Joined Time</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {waitlist.map((entry, idx) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 font-extrabold text-xs text-purple-700">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900">{entry.patientName}</p>
                          <p className="text-xs text-gray-400">{entry.patientEmail}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800">{entry.doctorName}</p>
                          <p className="text-xs text-gray-400">{entry.specialization}</p>
                        </td>
                        <td className="py-3 px-4">{getPriorityBadge(entry.medicalPriority)}</td>
                        <td className="py-3 px-4">{getPriorityBadge(entry.urgency)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                              {entry.priorityScore} pts
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          &bull; {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(entry.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: DOCTOR ATTENDANCE & HOSPITAL QR MANAGEMENT                     */}
        {/* =================================================================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Top KPI Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block">
                  Active QR Gates
                </span>
                <strong className="text-2xl font-black text-purple-700 mt-1 block">
                  {hospitalQRCodes.length}
                </strong>
                <span className="text-[11px] text-gray-400 mt-0.5 block">
                  Active hospital scan locations
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block">
                  Clinicians On Duty
                </span>
                <strong className="text-2xl font-black text-emerald-600 mt-1 block">
                  {
                    doctors.filter(
                      (d) =>
                        d.currentPresence === 'PRESENT' ||
                        d.currentPresence === 'IN_CONSULTATION' ||
                        d.currentPresence === 'AVAILABLE'
                    ).length
                  }
                </strong>
                <span className="text-[11px] text-emerald-700 mt-0.5 block font-semibold">
                  ● Verified in hospital OPD
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block">
                  Total Logged Sessions
                </span>
                <strong className="text-2xl font-black text-blue-700 mt-1 block">
                  {attendanceRecords.length}
                </strong>
                <span className="text-[11px] text-gray-400 mt-0.5 block">
                  Check-in / check-out history
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block">
                  QR Scan Audits
                </span>
                <strong className="text-2xl font-black text-indigo-700 mt-1 block">
                  {qrScanAudits.length}
                </strong>
                <span className="text-[11px] text-gray-400 mt-0.5 block">
                  Security verification events
                </span>
              </div>
            </div>

            {/* Two-Column: QR Generator Form & Active QR Gates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* 1. Generate Hospital QR Code Form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3 border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span>⚡ Generate Hospital Check-In QR Code</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Generate short-lived cryptographic QR codes to be posted at OPD reception desks or clinical suites.
                  </p>
                </div>

                <form onSubmit={handleCreateHospitalQR} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Hospital Check-In Location
                    </label>
                    <select
                      value={newQRLocation}
                      onChange={(e) => setNewQRLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="Main Hospital OPD Suite - Ground Floor">
                        Main Hospital OPD Suite - Ground Floor
                      </option>
                      <option value="MediFlow West Wing - Block A (Cardio &amp; Neuro)">
                        MediFlow West Wing - Block A (Cardio &amp; Neuro)
                      </option>
                      <option value="Emergency &amp; Trauma Center - Bay 1">
                        Emergency &amp; Trauma Center - Bay 1
                      </option>
                      <option value="Oncology Center - Room 401">
                        Oncology Center - Room 401
                      </option>
                      <option value="Nephrology &amp; Dialysis Unit - Room 310">
                        Nephrology &amp; Dialysis Unit - Room 310
                      </option>
                      <option value="Urology &amp; Renal OPD - Room 302">
                        Urology &amp; Renal OPD - Room 302
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Token Validity Window
                    </label>
                    <select
                      value={newQRValidity}
                      onChange={(e) => setNewQRValidity(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="15">15 Minutes (High Security Shift Turnover)</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">60 Minutes (Standard 1-Hour Shift Window)</option>
                      <option value="240">4 Hours (Half-Day Clinical Session)</option>
                      <option value="480">8 Hours (Full Working Day)</option>
                      <option value="1440">24 Hours (Full-Day Triage Gateway)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={generatingQR}
                    className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {generatingQR ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating Secure QR...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate &amp; Display Hospital QR</span>
                        <span>&rarr;</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* 2. Active Hospital QR Gates List */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Active Hospital QR Gates</h3>
                    <p className="text-xs text-gray-500">Live codes currently accepting doctor check-ins</p>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {hospitalQRCodes.length} Active
                  </span>
                </div>

                {hospitalQRCodes.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-xs">
                    <span className="text-3xl block mb-2">🏷️</span>
                    No active hospital QR codes. Generate one using the form on the left.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {hospitalQRCodes.map((qr) => (
                      <div
                        key={qr.id}
                        className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{qr.location}</p>
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                            Code: {qr.code}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Expires: {new Date(qr.expiresAt).toLocaleTimeString()} &bull; Total Check-Ins:{' '}
                            <strong className="text-purple-700">{qr.totalCheckIns}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={revokingCodeId === qr.id}
                            onClick={() => handleRevokeCode(qr.id)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg border border-red-200 transition cursor-pointer disabled:opacity-50"
                          >
                            {revokingCodeId === qr.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Attendance History Table */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Doctor Attendance &amp; Shift History
                  </h3>
                  <p className="text-xs text-gray-500">
                    Audit log of verified doctor check-ins, check-outs, and clinical work sessions.
                  </p>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={attendanceFilterDoctor}
                    onChange={(e) => setAttendanceFilterDoctor(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="ALL">All Doctors</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name || d.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={attendanceFilterDate}
                    onChange={(e) => setAttendanceFilterDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                  />

                  {(attendanceFilterDoctor !== 'ALL' || attendanceFilterDate) && (
                    <button
                      onClick={() => {
                        setAttendanceFilterDoctor('ALL');
                        setAttendanceFilterDate('');
                      }}
                      className="text-purple-600 font-bold text-xs hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {loadingAttendance ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-gray-400">Loading attendance records...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs">
                  <span className="text-3xl block mb-2">📋</span>
                  No attendance records matching current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="py-2.5 px-4">Doctor</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Check-In</th>
                        <th className="py-2.5 px-4">Check-Out</th>
                        <th className="py-2.5 px-4">Duration</th>
                        <th className="py-2.5 px-4">Verification</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendanceRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/60">
                          <td className="py-3 px-4">
                            <strong className="text-gray-900 block">{r.doctorName}</strong>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {r.specialization} &bull; {r.department}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">{r.location}</td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {new Date(r.checkInTime).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {r.checkOutTime
                              ? new Date(r.checkOutTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Ongoing'}
                          </td>
                          <td className="py-3 px-4 font-bold text-blue-700">
                            {r.durationMinutes
                              ? `${Math.floor(r.durationMinutes / 60)}h ${r.durationMinutes % 60}m`
                              : 'Active'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              {r.checkInMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'CHECKED_IN'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}
                            >
                              {r.status === 'CHECKED_IN' ? '● ON DUTY' : '✓ COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* QR Scan Security Audit Trail Feed */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="border-b pb-3 border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">
                  🛡️ QR Scan Security &amp; Audit Trail
                </h3>
                <p className="text-xs text-gray-500">
                  Comprehensive audit trail of all scan interactions, replay rejections, and expired token attempts.
                </p>
              </div>

              {qrScanAudits.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No scan audit events recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3">User / Clinician</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Result</th>
                        <th className="py-2 px-3">Location / Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {qrScanAudits.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50/60">
                          <td className="py-2 px-3 font-mono text-[11px] text-gray-500">
                            {new Date(a.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-3">
                            <strong className="text-gray-900">{a.doctorName || a.userId}</strong>{' '}
                            <span className="text-[10px] text-gray-400 font-mono">({a.userRole})</span>
                          </td>
                          <td className="py-2 px-3 font-bold text-gray-800">{a.action}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                a.status === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : a.status === 'REPLAY_REJECTED'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-gray-600 truncate max-w-xs">
                            {a.location}{' '}
                            {a.failureReason && (
                              <span className="text-red-600 italic block text-[10px]">
                                {a.failureReason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: MEDIFLOW AI INTELLIGENCE CENTER (v2.0 ML)                      */}
        {/* =================================================================== */}
        {activeTab === 'intelligence' && <AIIntelligenceCenter />}

        {/* =================================================================== */}
        {/* QR CODE PREVIEW & PRINT MODAL                                       */}
        {/* =================================================================== */}
        {qrPreviewModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="text-left">
                  <h3 className="text-base font-black text-gray-900">Hospital OPD Check-In QR</h3>
                  <p className="text-[11px] text-purple-700 font-bold">{qrPreviewModal.location}</p>
                </div>
                <button
                  onClick={() => setQrPreviewModal(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 inline-block shadow-inner">
                <img
                  src={qrPreviewModal.qrDataUrl}
                  alt="Hospital Attendance QR Code"
                  className="w-56 h-56 mx-auto rounded-xl shadow-xs"
                />
              </div>

              <div className="text-xs space-y-1">
                <p className="font-mono text-[11px] text-gray-500">
                  ID: {qrPreviewModal.qrCode?.code}
                </p>
                <p className="text-gray-600">
                  Validity: <strong>{qrPreviewModal.validityMinutes} minutes</strong>
                </p>
                <p className="text-amber-700 font-semibold text-[11px]">
                  ⏰ Expires at {new Date(qrPreviewModal.expiresAt).toLocaleTimeString()}
                </p>
              </div>

              <p className="text-[11px] text-gray-400 leading-tight">
                Print or display this QR code at the clinic desk. Clinicians will scan it via their phone to log attendance.
              </p>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  🖨️ Print Desk Sign
                </button>
                <button
                  type="button"
                  onClick={() => setQrPreviewModal(null)}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* DOCTOR DETAILS INSPECTION MODAL */}
        {/* ------------------------------------------------------------------- */}
        {selectedDoctorId && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 p-6 sm:p-8">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                    Doctor Administrative Profile
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">
                    {doctorDetails?.name || 'Doctor Credentials'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {doctorDetails?.specialization} &bull; {doctorDetails?.department}
                  </p>
                </div>
                <button
                  onClick={closeDoctorModal}
                  className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {loadingDoctorDetails ? (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-gray-500">Loading doctor records...</p>
                </div>
              ) : doctorDetails ? (
                <div className="space-y-6">
                  {/* Credentials Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase">Experience</span>
                      <span className="font-bold text-gray-800 text-sm">{doctorDetails.experience} Years</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase">Duration</span>
                      <span className="font-bold text-gray-800 text-sm">{doctorDetails.consultationDuration} Mins</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase">Fee</span>
                      <span className="font-bold text-gray-800 text-sm">₹{doctorDetails.consultationFee}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase">Presence</span>
                      <div className="mt-1">{getPresenceBadge(doctorDetails.currentPresence)}</div>
                    </div>
                  </div>

                  {/* Weekly Availability Schedule */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Weekly Availability Schedule</h3>
                    {doctorDetails.availabilities?.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No schedule configured.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {doctorDetails.availabilities.map((sched) => (
                          <div
                            key={sched.id}
                            className={`p-2.5 rounded-lg border text-xs ${
                              sched.isAvailable
                                ? 'bg-green-50 border-green-200 text-green-900'
                                : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}
                          >
                            <p className="font-bold">{sched.dayOfWeek}</p>
                            <p className="text-[11px]">
                              {sched.startTime} - {sched.endTime}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Presence Status Logs */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Recent Presence Audit Logs</h3>
                    {doctorDetails.presenceLogs?.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No presence logs recorded.</p>
                    ) : (
                      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Method</th>
                              <th className="py-2 px-3">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {doctorDetails.presenceLogs.map((log) => (
                              <tr key={log.id}>
                                <td className="py-2 px-3">{getPresenceBadge(log.status)}</td>
                                <td className="py-2 px-3 text-gray-600 font-mono text-[10px]">
                                  {log.detectionMethod}
                                </td>
                                <td className="py-2 px-3 text-gray-400 text-[11px]">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Appointments */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Recent Appointments</h3>
                    {doctorDetails.recentAppointments?.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No recent appointments recorded.</p>
                    ) : (
                      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Patient</th>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Time</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {doctorDetails.recentAppointments.map((apt) => (
                              <tr key={apt.id}>
                                <td className="py-2 px-3 font-medium text-gray-900">
                                  {apt.patientName}
                                </td>
                                <td className="py-2 px-3 text-gray-600">
                                  {new Date(apt.appointmentDate).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-3 text-gray-500">
                                  {apt.startTime} - {apt.endTime}
                                </td>
                                <td className="py-2 px-3">{getStatusBadge(apt.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 pt-4 border-t border-gray-100 text-right">
                <button
                  onClick={closeDoctorModal}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 bg-white border-t border-gray-100">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 8 Hospital Control Center
      </footer>
    </div>
  );
}

export default AdminDashboard;
